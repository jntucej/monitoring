import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { ok, fail } from "@/server/http/response";
import { sanitizeAgentPayload } from "@/lib/agent/redactor";
import type { AuthContext } from "@/lib/authContext";

const AUTHORITY_ROLES = [
  "faculty", "hod", "deputy_warden", "hostel_manager",
  "oie", "exam_branch", "exam_superintendent", "vice_principal", "principal",
  "admin", "sysadmin", "dean", "chief_warden", "controller_examinations",
] as const;

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const doubtId = parts[parts.length - 2];

  const { rows: dRows } = await query<{
    id: string;
    group_id: string;
    topic: string;
    question: string;
    target_role: string;
    status: string;
  }>(
    `SELECT id, group_id, topic, question, target_role, status
       FROM public.class_doubt_escalations
      WHERE id = $1::uuid
      LIMIT 1`,
    [doubtId],
  );

  const doubt = dRows[0];
  if (!doubt) {
    return fail("NOT_FOUND", "Doubt not found.", 404);
  }

  const body = await req.json().catch(() => null);
  const replyText = typeof body?.reply === "string" ? body.reply.trim() : "";
  const publishToClass = Boolean(body?.publish_to_class);

  if (!replyText || replyText.length > 3000) {
    return fail("BAD_REQUEST", "Authority reply is required (max 3000 chars).", 400);
  }

  let publishedMessageId: string | null = null;
  if (publishToClass) {
    const { rows: msgRows } = await query<{ id: string }>(
      `INSERT INTO public.chat_messages (group_id, sender_id, sender_kind, message_type, body, metadata)
       VALUES ($1::uuid, $2::uuid, 'user', 'status_card', $3, $4::jsonb)
       RETURNING id`,
      [
        doubt.group_id,
        auth.userId,
        `Verified Answer (${doubt.topic} · ${auth.role}): ${replyText}`,
        JSON.stringify({ kind: "verified_authority_answer", topic: doubt.topic, answered_by_role: auth.role }),
      ],
    );
    publishedMessageId = msgRows[0]?.id ?? null;
  }

  const { rows: updated } = await query<{
    id: string;
    topic: string;
    status: string;
    authority_reply: string;
    publish_to_class: boolean;
    answered_at: string;
  }>(
    `UPDATE public.class_doubt_escalations
        SET status = 'answered',
            authority_reply = $2,
            answered_by = $3::uuid,
            answered_at = NOW(),
            publish_to_class = $4,
            published_message_id = $5::uuid,
            updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING id, topic, status, authority_reply, publish_to_class, answered_at`,
    [doubt.id, replyText, auth.userId, publishToClass, publishedMessageId],
  );

  await addAudit({
    action: "CLASS_DOUBT_ANSWERED",
    userId: auth.userId,
    role: auth.role,
    details: { doubtId: doubt.id, publishToClass },
  }).catch(() => {});

  return ok({ doubt: sanitizeAgentPayload(updated[0], auth.role) });
}

export const POST = withAuthorization(handlePost, { requiredRole: [...AUTHORITY_ROLES] });
