import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { publishApprovedCircular } from "@/lib/circulars/pipeline";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const circularId = parts[parts.length - 2];
  const b = await req.json().catch(() => null);
  const action = String(b?.action ?? "").toLowerCase();

  if (!["forward_principal", "request_revision", "withdraw", "approve", "reject"].includes(action)) {
    return fail("INVALID_ACTION", "action must be forward_principal, request_revision, withdraw, approve, or reject", 400);
  }

  if (action === "request_revision") {
    const remarks = String(b?.reason ?? b?.remarks ?? "Please revise and resubmit").trim();
    const { rows } = await query(
      `UPDATE public.circular_requests
          SET status = 'revision_requested', revision_remarks = $2, updated_at = NOW()
        WHERE id = $1::uuid AND status IN ('pending_vp', 'pending_principal')
        RETURNING id, status, revision_remarks`,
      [circularId, remarks],
    );
    if (!rows[0]) return fail("NOT_FOUND", "Pending circular not found", 404);
    await addAudit({
      action: "CIRCULAR_REVISION_REQUESTED",
      userId: auth.userId,
      role: auth.role,
      details: { circularId, remarks },
    });
    return ok(rows[0]);
  }

  if (action === "withdraw") {
    const reason = String(b?.reason ?? "Withdrawn by authority").trim();
    const { rows } = await query<{ id: string; feed_item_id: string | null }>(
      `UPDATE public.circular_requests
          SET status = 'withdrawn', withdrawn_at = NOW(), withdrawn_reason = $2, updated_at = NOW()
        WHERE id = $1::uuid
        RETURNING id, feed_item_id`,
      [circularId, reason],
    );
    if (!rows[0]) return fail("NOT_FOUND", "Circular not found", 404);
    if (rows[0].feed_item_id) {
      await query(`UPDATE public.campus_feed_items SET status = 'archived' WHERE id = $1::uuid`, [
        rows[0].feed_item_id,
      ]);
    }
    await addAudit({
      action: "CIRCULAR_WITHDRAWN",
      userId: auth.userId,
      role: auth.role,
      details: { circularId, reason },
    });
    return ok({ id: circularId, status: "withdrawn" });
  }

  if (action === "forward_principal") {
    const { rows } = await query(
      `UPDATE public.circular_requests
          SET status = 'pending_principal', vp_reviewed_by = $2::uuid, vp_reviewed_at = NOW(), updated_at = NOW()
        WHERE id = $1::uuid AND status = 'pending_vp'
        RETURNING id, status`,
      [circularId, auth.userId],
    );
    if (!rows[0]) return fail("NOT_FOUND", "Pending VP circular not found", 404);
    return ok(rows[0]);
  }

  if (action === "reject") {
    const reason = String(b?.reason ?? "Rejected").trim();
    const { rows } = await query(
      `UPDATE public.circular_requests
          SET status = 'rejected', rejection_reason = $2, updated_at = NOW()
        WHERE id = $1::uuid AND status IN ('pending_vp', 'pending_principal')
        RETURNING id, status`,
      [circularId, reason],
    );
    if (!rows[0]) return fail("NOT_FOUND", "Pending circular not found", 404);
    await addAudit({
      action: "CIRCULAR_REJECTED",
      userId: auth.userId,
      role: auth.role,
      details: { circularId, reason },
    });
    return ok(rows[0]);
  }

  // Approve & publish (Principal / Admin / Sysadmin)
  if (!["principal", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Only Principal or Admin can give final approval", 403);
  }

  const pub = await publishApprovedCircular(circularId, auth.userId, auth.role);
  if (!pub) return fail("NOT_FOUND", "Circular not found", 404);
  return ok({ status: "published", ...pub });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["vice_principal", "principal", "admin", "sysadmin"],
});
