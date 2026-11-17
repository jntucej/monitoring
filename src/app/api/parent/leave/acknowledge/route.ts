// /api/parent/leave/acknowledge/route.ts
// The missing link in the hostel leave gate chain (STEP 3.8):
// a hostel student's gate pass is valid only when BOTH the Deputy Warden
// approval AND this parent acknowledgement exist. Without it,
// leave_requests.status stays at WARDEN_APPROVED and the gate returns
// PENDING_HOSTEL_LEAVE.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

/** Resolve the parent's ward ids via student_details.guardian_id. */
async function wardIds(auth: AuthContext): Promise<string[]> {
  const res = await query<{ user_id: string }>(
    `SELECT user_id FROM public.student_details WHERE guardian_id = $1`,
    [auth.userId],
  );
  return res.rows.map((r) => r.user_id);
}

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as {
    leaveRequestId?: string;
  } | null;
  if (!body?.leaveRequestId) {
    return fail("VALIDATION_ERROR", "leaveRequestId required", 400);
  }

  const wards = await wardIds(auth);
  const { rows } = await query<{ student_id: string; status: string }>(
    `SELECT student_id, status FROM public.leave_requests WHERE id = $1`,
    [body.leaveRequestId],
  );
  if (rows.length === 0) return fail("NOT_FOUND", "Leave request not found", 404);
  const lr = rows[0];

  // Parent must be the ward's guardian (parent role is bound via
  // student_details.guardian_id; the auth layer already scopes the
  // session, this is the server-side re-check).
  if (!wards.includes(lr.student_id)) {
    return fail("FORBIDDEN", "Leave request does not belong to your ward", 403);
  }
  if (lr.status !== "WARDEN_APPROVED") {
    return fail("PRECONDITION",
      `Leave is ${lr.status}; acknowledgement requires WARDEN_APPROVED`, 409);
  }

  await query(
    `UPDATE public.leave_requests
        SET status = 'PARENT_ACKNOWLEDGED',
            parent_acknowledged_by = $2,
            parent_acknowledged_at = now()
      WHERE id = $1`,
    [body.leaveRequestId, auth.userId],
  );
  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role, action: "parent_leave_acknowledge",
    resource: "leave_requests", resourceId: body.leaveRequestId,
  });
  return ok({ leaveRequestId: body.leaveRequestId, status: "PARENT_ACKNOWLEDGED" });
}

export const POST = withMutationGuard(implPost, {
  requiredRole: ["parent", "guardian", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "parent-leave-ack", maxRequests: 5 },
});
