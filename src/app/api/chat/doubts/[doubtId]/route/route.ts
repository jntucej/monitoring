import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { ok, fail } from "@/server/http/response";
import { sanitizeAgentPayload } from "@/lib/agent/redactor";
import type { AuthContext } from "@/lib/authContext";

const ALL_CHAT_ROLES = [
  "student", "faculty", "staff", "hod", "deputy_warden", "hostel_manager",
  "oie", "exam_branch", "exam_superintendent", "vice_principal", "principal",
  "admin", "sysadmin", "operator", "supervisor", "caretaker", "emo",
  "mess_incharge", "dean", "chief_warden", "controller_examinations",
  "addl_controller_academic", "addl_controller_results", "addl_controller_automation",
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
    target_role: string;
    escalation_chain: string[];
    status: string;
    member_role: string | null;
  }>(
    `SELECT d.id, d.group_id, d.topic, d.target_role, d.escalation_chain, d.status, m.member_role
       FROM public.class_doubt_escalations d
       LEFT JOIN public.chat_group_members m
         ON m.group_id = d.group_id AND m.user_id = $2::uuid
      WHERE d.id = $1::uuid
      LIMIT 1`,
    [doubtId, auth.userId],
  );

  const doubt = dRows[0];
  if (!doubt) {
    return fail("NOT_FOUND", "Doubt not found.", 404);
  }

  const canRoute =
    auth.role !== "student" ||
    doubt.member_role === "moderator" ||
    doubt.member_role === "owner";

  if (!canRoute) {
    return fail("FORBIDDEN", "Only faculty, class rep (moderator), or authority roles can route doubts.", 403);
  }

  const body = await req.json().catch(() => ({}));
  const requestedTarget = typeof body?.target_role === "string" ? body.target_role.trim() : "";
  const nextTarget = requestedTarget || doubt.target_role;

  const { rows: updated } = await query<{
    id: string;
    topic: string;
    target_role: string;
    status: string;
    updated_at: string;
  }>(
    `UPDATE public.class_doubt_escalations
        SET status = 'routed',
            routed_by = $2::uuid,
            target_role = $3,
            updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING id, topic, target_role, status, updated_at`,
    [doubt.id, auth.userId, nextTarget],
  );

  await query(
    `INSERT INTO public.chat_messages (group_id, sender_kind, message_type, body, metadata)
     VALUES ($1::uuid, 'system', 'status_card', $2, $3::jsonb)`,
    [
      doubt.group_id,
      `Doubt (${doubt.topic}) routed to ${nextTarget} for review.`,
      JSON.stringify({ kind: "doubt_routed", topic: doubt.topic, target_role: nextTarget }),
    ],
  );

  await addAudit({
    action: "CLASS_DOUBT_ROUTED",
    userId: auth.userId,
    role: auth.role,
    details: { doubtId: doubt.id, targetRole: nextTarget },
  }).catch(() => {});

  return ok({ doubt: sanitizeAgentPayload(updated[0], auth.role) });
}

export const POST = withAuthorization(handlePost, { requiredRole: [...ALL_CHAT_ROLES] });
