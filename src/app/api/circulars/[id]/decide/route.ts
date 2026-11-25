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

  if (!["forward_principal", "approve", "reject"].includes(action)) {
    return fail("INVALID_ACTION", "action must be forward_principal, approve, or reject", 400);
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
