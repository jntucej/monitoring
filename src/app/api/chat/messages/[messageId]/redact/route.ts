import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { ok, fail } from "@/server/http/response";
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
  const messageId = parts[parts.length - 2];

  const { rows } = await query<{
    id: string;
    sender_id: string | null;
    member_role: string | null;
  }>(
    `SELECT cm.id, cm.sender_id, m.member_role
       FROM public.chat_messages cm
       LEFT JOIN public.chat_group_members m
         ON m.group_id = cm.group_id AND m.user_id = $2::uuid
      WHERE cm.id = $1::uuid
      LIMIT 1`,
    [messageId, auth.userId],
  );

  const msg = rows[0];
  if (!msg) {
    return fail("NOT_FOUND", "Message not found.", 404);
  }

  const canRedact =
    msg.sender_id === auth.userId ||
    msg.member_role === "owner" ||
    msg.member_role === "moderator" ||
    auth.role === "admin" ||
    auth.role === "sysadmin";

  if (!canRedact) {
    return fail("FORBIDDEN", "Not permitted to redact this message.", 403);
  }

  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 200) : "Removed by moderator";

  await query(
    `UPDATE public.chat_messages
        SET deleted_at = NOW(),
            deleted_by = $2::uuid,
            redaction_reason = $3,
            body = '[Message removed]'
      WHERE id = $1::uuid`,
    [msg.id, auth.userId, reason],
  );

  await addAudit({
    action: "CHAT_MESSAGE_REDACTED",
    userId: auth.userId,
    role: auth.role,
    details: { messageId: msg.id, reason },
  }).catch(() => {});

  return ok({ redacted: true });
}

export const POST = withAuthorization(handlePost, { requiredRole: [...ALL_CHAT_ROLES] });
