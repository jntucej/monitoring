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

  const b = await req.json().catch(() => null);
  const postId = String(b?.post_id ?? "").trim();
  const operatorId = String(b?.operator_id ?? "").trim();
  const startsAt = String(b?.starts_at ?? "").trim();
  const endsAt = String(b?.ends_at ?? "").trim();
  const reason = String(b?.reason ?? "Extra coverage").trim();

  if (!postId || !operatorId || !startsAt || !endsAt) {
    return fail("INVALID_INPUT", "post_id, operator_id, starts_at, ends_at are required", 400);
  }

  const shiftDate = startsAt.slice(0, 10);
  const { rows: shRows } = await query<{ id: string }>(
    `INSERT INTO public.security_shifts
       (template_id, shift_date, starts_at, ends_at, supervisor_id, status, published_at, is_extra, extra_reason)
     VALUES (NULL, $1::date, $2::timestamptz, $3::timestamptz, $4::uuid, 'published', NOW(), true, $5)
     RETURNING id`,
    [shiftDate, startsAt, endsAt, auth.userId, reason],
  );
  const shiftId = shRows[0].id;

  const { rows: assignRows } = await query(
    `INSERT INTO public.shift_post_assignments (shift_id, post_id, operator_id, status, notes)
     VALUES ($1::uuid, $2::uuid, $3::uuid, 'assigned', $4)
     RETURNING *`,
    [shiftId, postId, operatorId, `Extra shift: ${reason}`],
  );

  await publishNotification({
    eventType: "security.shift.extra_assigned",
    actorId: auth.userId,
    actorRole: auth.role,
    scope: `user:${operatorId}`,
    title: "Extra shift assigned",
    message: `Extra shift assigned (${reason}) from ${startsAt} to ${endsAt}.`,
    payload: { shift_id: shiftId, post_id: postId, reason },
    priority: "high",
    channels: ["in_app"],
  }).catch(() => {});

  return ok({ shift_id: shiftId, assignment: assignRows[0] }, 201);
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["supervisor", "admin", "sysadmin"],
});
