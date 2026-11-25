import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { publishNotification } from "@/lib/notifications/bus";

async function handleGet(req: NextRequest) {
  const parts = new URL(req.url).pathname.split("/");
  const shiftId = parts[parts.length - 2];
  const { rows } = await query(
    `SELECT spa.*, u.name AS operator_name, u.unique_id AS operator_code,
            sp.code AS post_code, sp.name AS post_name, sp.kind AS post_kind
       FROM public.shift_post_assignments spa
       JOIN public.users u ON u.id = spa.operator_id
       JOIN public.security_posts sp ON sp.id = spa.post_id
      WHERE spa.shift_id = $1::uuid
      ORDER BY sp.name ASC`,
    [shiftId],
  );
  return ok({ assignments: rows });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const shiftId = parts[parts.length - 2];
  const b = await req.json().catch(() => null);
  const postId = String(b?.post_id ?? "").trim();
  const operatorId = String(b?.operator_id ?? "").trim();
  const status = String(b?.status ?? "assigned").trim();

  if (!shiftId || !postId || !operatorId) {
    return fail("INVALID_INPUT", "post_id and operator_id are required", 400);
  }

  const { rows } = await query(
    `INSERT INTO public.shift_post_assignments (shift_id, post_id, operator_id, status, checked_in_at)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4, CASE WHEN $4 = 'checked_in' THEN NOW() ELSE NULL END)
     RETURNING *`,
    [shiftId, postId, operatorId, status],
  );

  await publishNotification({
    eventType: "security.shift.assigned",
    actorId: auth.userId,
    actorRole: auth.role,
    scope: `user:${operatorId}`,
    title: "Shift post assigned",
    message: "You have been assigned to a security post.",
    payload: { shift_id: shiftId, post_id: postId },
    priority: "normal",
    channels: ["in_app"],
  }).catch(() => {});

  return ok(rows[0], 201);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["supervisor", "admin", "sysadmin"],
});
export const POST = withAuthorization(handlePost, {
  requiredRole: ["supervisor", "admin", "sysadmin"],
});
