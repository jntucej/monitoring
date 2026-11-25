import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { publishNotification } from "@/lib/notifications/bus";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  const { rows } = await query(
    auth.role === "operator"
      ? `SELECT h.*, sp.name AS post_name, u1.name AS from_name, u2.name AS to_name
           FROM public.shift_handover_requests h
           JOIN public.security_posts sp ON sp.id = h.post_id
           JOIN public.users u1 ON u1.id = h.from_operator_id
           JOIN public.users u2 ON u2.id = h.to_operator_id
          WHERE (h.to_operator_id = $1::uuid OR h.from_operator_id = $1::uuid)
          ORDER BY h.requested_at DESC LIMIT 30`
      : `SELECT h.*, sp.name AS post_name, u1.name AS from_name, u2.name AS to_name
           FROM public.shift_handover_requests h
           JOIN public.security_posts sp ON sp.id = h.post_id
           JOIN public.users u1 ON u1.id = h.from_operator_id
           JOIN public.users u2 ON u2.id = h.to_operator_id
          ORDER BY h.requested_at DESC LIMIT 50`,
    auth.role === "operator" ? [auth.userId] : [],
  );
  return ok({ handovers: rows });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const shiftId = String(b?.shift_id ?? "").trim();
  const postId = String(b?.post_id ?? "").trim();
  const fromOperatorId = String(b?.from_operator_id ?? auth.userId).trim();
  const toOperatorId = String(b?.to_operator_id ?? "").trim();
  const notes = b?.notes ? String(b.notes) : null;

  if (!shiftId || !postId || !toOperatorId) {
    return fail("INVALID_INPUT", "shift_id, post_id, and to_operator_id are required", 400);
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO public.shift_handover_requests
       (shift_id, post_id, from_operator_id, to_operator_id, notes)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5)
     RETURNING id`,
    [shiftId, postId, fromOperatorId, toOperatorId, notes],
  );

  await publishNotification({
    eventType: "security.shift.handover_requested",
    actorId: auth.userId,
    actorRole: auth.role,
    scope: `user:${toOperatorId}`,
    title: "Shift handover requested",
    message: notes || "Please accept the shift handover to check in.",
    payload: { handover_id: rows[0].id, shift_id: shiftId, post_id: postId },
    priority: "high",
    channels: ["in_app"],
  }).catch(() => {});

  return ok({ id: rows[0].id, status: "pending" }, 201);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["operator", "supervisor", "principal", "admin", "sysadmin"],
});
export const POST = withAuthorization(handlePost, {
  requiredRole: ["operator", "supervisor", "admin", "sysadmin"],
});
