import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { publishNotification } from "@/lib/notifications/bus";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const handoverId = parts[parts.length - 2];

  const { rows } = await query<{
    id: string;
    shift_id: string;
    post_id: string;
    from_operator_id: string;
    to_operator_id: string;
    status: string;
  }>(
    `UPDATE public.shift_handover_requests
        SET status = 'accepted', responded_at = NOW()
      WHERE id = $1::uuid
        AND status = 'pending'
        AND ($2 = 'supervisor' OR $2 = 'admin' OR $2 = 'sysadmin' OR to_operator_id = $3::uuid)
      RETURNING id, shift_id, post_id, from_operator_id, to_operator_id, status`,
    [handoverId, auth.role, auth.userId],
  );
  const h = rows[0];
  if (!h) return fail("NOT_FOUND", "Pending handover request not found", 404);

  // Relieve outgoing guard
  const { rows: prevAssign } = await query<{ id: string }>(
    `UPDATE public.shift_post_assignments
        SET status = 'relieved', checked_out_at = NOW()
      WHERE shift_id = $1::uuid AND operator_id = $2::uuid AND status IN ('assigned', 'checked_in')
      RETURNING id`,
    [h.shift_id, h.from_operator_id],
  );

  // Check in incoming guard
  await query(
    `INSERT INTO public.shift_post_assignments
       (shift_id, post_id, operator_id, status, checked_in_at, handover_from)
     VALUES ($1::uuid, $2::uuid, $3::uuid, 'checked_in', NOW(), $4::uuid)
     ON CONFLICT (shift_id, operator_id) DO UPDATE
       SET post_id = EXCLUDED.post_id,
           status = 'checked_in',
           checked_in_at = COALESCE(public.shift_post_assignments.checked_in_at, NOW()),
           handover_from = EXCLUDED.handover_from`,
    [h.shift_id, h.post_id, h.to_operator_id, prevAssign[0]?.id ?? null],
  );

  await publishNotification({
    eventType: "security.shift.handover_accepted",
    actorId: auth.userId,
    actorRole: auth.role,
    scope: `user:${h.from_operator_id}`,
    title: "Shift handover accepted",
    message: "Incoming guard has checked in and relieved your post.",
    payload: { handover_id: h.id, shift_id: h.shift_id },
    priority: "normal",
    channels: ["in_app"],
  }).catch(() => {});

  return ok({ accepted: true, handover_id: h.id });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["operator", "supervisor", "admin", "sysadmin"],
});
