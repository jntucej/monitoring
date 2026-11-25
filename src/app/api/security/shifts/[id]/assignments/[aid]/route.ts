import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { publishNotification } from "@/lib/notifications/bus";

async function handlePatch(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const aid = parts[parts.length - 1];
  const b = await req.json().catch(() => null);

  const { rows: prevRows } = await query<{ operator_id: string; shift_id: string }>(
    `SELECT operator_id, shift_id FROM public.shift_post_assignments WHERE id = $1::uuid LIMIT 1`,
    [aid],
  );
  const prev = prevRows[0];
  if (!prev) return fail("NOT_FOUND", "Assignment not found", 404);

  const newOperatorId = b?.operator_id ? String(b.operator_id) : null;
  const newStatus = b?.status ? String(b.status) : null;

  const { rows } = await query(
    `UPDATE public.shift_post_assignments
        SET operator_id = COALESCE($2::uuid, operator_id),
            status = COALESCE($3, status),
            checked_in_at = CASE WHEN $3 = 'checked_in' THEN COALESCE(checked_in_at, NOW()) ELSE checked_in_at END,
            checked_out_at = CASE WHEN $3 = 'checked_out' THEN NOW() ELSE checked_out_at END
      WHERE id = $1::uuid
      RETURNING *`,
    [aid, newOperatorId, newStatus],
  );

  if (newOperatorId && newOperatorId !== prev.operator_id) {
    await publishNotification({
      eventType: "security.shift.relieved",
      actorId: auth.userId,
      actorRole: auth.role,
      scope: `user:${prev.operator_id}`,
      title: "Shift assignment relieved",
      message: "You have been relieved from your shift post.",
      payload: { shift_id: prev.shift_id },
      priority: "normal",
      channels: ["in_app"],
    }).catch(() => {});

    await publishNotification({
      eventType: "security.shift.assigned",
      actorId: auth.userId,
      actorRole: auth.role,
      scope: `user:${newOperatorId}`,
      title: "Shift post assigned",
      message: "You have been assigned to cover a security post.",
      payload: { shift_id: prev.shift_id },
      priority: "high",
      channels: ["in_app"],
    }).catch(() => {});
  }

  return ok(rows[0]);
}

async function handleDelete(req: NextRequest) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const aid = parts[parts.length - 1];
  await query(`DELETE FROM public.shift_post_assignments WHERE id = $1::uuid`, [aid]);
  return ok({ deleted: true, id: aid });
}

export const PATCH = withAuthorization(handlePatch, {
  requiredRole: ["supervisor", "admin", "sysadmin"],
});
export const DELETE = withAuthorization(handleDelete, {
  requiredRole: ["supervisor", "admin", "sysadmin"],
});
