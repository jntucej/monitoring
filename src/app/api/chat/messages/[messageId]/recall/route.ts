import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

const RECALL_ROLES = [
  "faculty", "staff", "hod", "deputy_warden", "hostel_manager",
  "oie", "exam_branch", "exam_superintendent", "vice_principal", "principal",
  "admin", "sysadmin", "supervisor", "dean", "chief_warden", "controller_examinations",
] as const;

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const messageId = parts[parts.length - 2];

  const { rows } = await query<{ id: string; group_id: string; sender_id: string | null }>(
    `SELECT id, group_id, sender_id FROM public.chat_messages WHERE id = $1::uuid LIMIT 1`,
    [messageId],
  );

  const msg = rows[0];
  if (!msg) {
    return fail("NOT_FOUND", "Message not found.", 404);
  }

  const canRecall =
    msg.sender_id === auth.userId ||
    auth.role === "principal" ||
    auth.role === "vice_principal" ||
    auth.role === "hod" ||
    auth.role === "admin" ||
    auth.role === "sysadmin";

  if (!canRecall) {
    return fail("FORBIDDEN", "Not permitted to recall this announcement.", 403);
  }

  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 300) : "Recalled by issuer";
  const corrigendum = typeof body?.corrigendum === "string" ? body.corrigendum.trim().slice(0, 2000) : "";

  let supersededById: string | null = null;
  if (corrigendum) {
    const { rows: corrRows } = await query<{ id: string }>(
      `INSERT INTO public.chat_messages (group_id, sender_id, sender_kind, message_type, body, metadata)
       VALUES ($1::uuid, $2::uuid, 'user', 'status_card', $3, $4::jsonb)
       RETURNING id`,
      [
        msg.group_id,
        auth.userId,
        `[CORRIGENDUM] ${corrigendum}`,
        JSON.stringify({ kind: "corrigendum", supersedes_message_id: msg.id }),
      ],
    );
    supersededById = corrRows[0]?.id ?? null;
  }

  await query(
    `UPDATE public.chat_messages
        SET recalled_at = NOW(),
            recalled_by = $2::uuid,
            recall_reason = $3,
            superseded_by_id = $4::uuid
      WHERE id = $1::uuid`,
    [msg.id, auth.userId, reason, supersededById],
  );

  await addAudit({
    action: "CHAT_ANNOUNCEMENT_RECALLED",
    userId: auth.userId,
    role: auth.role,
    details: { messageId: msg.id, reason, supersededById },
  }).catch(() => {});

  return ok({ recalled: true, superseded_by_id: supersededById });
}

export const POST = withAuthorization(handlePost, { requiredRole: [...RECALL_ROLES] });
