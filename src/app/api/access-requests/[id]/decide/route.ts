import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const id = parts[parts.length - 2];
  const b = await req.json().catch(() => null);
  const decision = b?.decision === "approved" ? "approved" : b?.decision === "rejected" ? "rejected" : null;
  if (!decision) return fail("INVALID_DECISION", "decision must be approved or rejected", 400);

  const { rows } = await query(
    `UPDATE public.access_requests
        SET status = $2, decided_by = $3::uuid, decided_at = NOW(), decision_note = $4
      WHERE id = $1::uuid AND status = 'pending'
      RETURNING *`,
    [id, decision, auth.userId, b?.note ?? null],
  );
  if (!rows[0]) return fail("NOT_FOUND", "Pending access request not found", 404);

  await addAudit({
    action: `ACCESS_REQUEST_${decision.toUpperCase()}`,
    userId: auth.userId,
    role: auth.role,
    details: { requestId: id, requestedRole: rows[0].requested_role },
  });

  return ok(rows[0]);
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["admin", "sysadmin", "principal"],
});
