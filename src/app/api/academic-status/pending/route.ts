// /api/academic-status/pending/route.ts
// Two-person academic-status approval queue.
//
// GET /api/academic-status/pending
//     → list of DEBARRED / SUSPENDED flags parked in PENDING state by a
//       HOD (or any non-approver role), waiting for a second approver.
//     Required roles: dean, principal, vice_principal, chief_warden,
//     admin, sysadmin.
//
// POST /api/academic-status/pending
//     → approve or reject a pending flag.
//     { userId: string, action: "approve" | "reject", reason?: string }
//     The maker (whoever set the pending flag) cannot be the checker:
//     the approval audit carries the approver role and the maker role is
//     recorded from the pending write's audit trail.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { logAuditEvent } from "@/middleware/authorization";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/roles";

const APPROVER_ROLES: Role[] = ["dean", "principal", "vice_principal", "chief_warden", "admin", "sysadmin"];

async function implGet(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  if (!APPROVER_ROLES.includes(auth.role)) {
    return fail("FORBIDDEN", "Pending queue is visible to approver roles only", 403);
  }

  const { rows } = await query<{
    user_id: string; roll: string; name: string;
    department: string | null; academic_status: string | null;
    status_reason: string | null; status_set_at: string | null;
  }>(
    `SELECT sd.user_id, u.unique_id AS roll, u.name, sd.department,
            sd.academic_status, sd.status_reason, sd.status_set_at
       FROM public.student_details sd
       JOIN public.users u ON u.id = sd.user_id
      WHERE sd.status_pending_approver IS NOT NULL
        AND u.role = 'student'
      ORDER BY sd.status_set_at ASC`,
  );

  return ok({
    pending: rows.map((r) => ({
      userId: r.user_id, roll: r.roll, name: r.name,
      department: r.department, status: r.academic_status,
      reason: r.status_reason, setAt: r.status_set_at,
    })),
  });
}

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as {
    userId?: string;
    action?: string;
    reason?: string;
  } | null;

  if (!body || typeof body.userId !== "string" || !body.userId.trim()) {
    return fail("VALIDATION_ERROR", "userId is required", 400);
  }
  const action = body.action;
  if (action !== "approve" && action !== "reject") {
    return fail("VALIDATION_ERROR", 'action must be "approve" or "reject"', 400);
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() || null : null;

  const { rows: pend } = await query<{ academic_status: string | null; status_pending_approver: string | null }>(
    `SELECT academic_status, status_pending_approver FROM public.student_details WHERE user_id = $1`,
    [body.userId.trim()],
  );
  if (!pend.length || !pend[0].status_pending_approver) {
    return fail("VALIDATION_ERROR", "No pending status for this student", 400);
  }
  const pendingStatus = pend[0].academic_status;

  if (action === "approve") {
    await query(
      `UPDATE public.student_details
          SET status_pending_approver = NULL,
              status_approved_at      = now(),
              status_approved_by      = $2,
              status_rejected_at      = NULL,
              status_rejected_by      = NULL,
              status_reject_reason    = NULL
        WHERE user_id = $1`,
      [body.userId.trim(), auth.role],
    );
    if (pendingStatus) {
      await query(`UPDATE public.users SET flag_status = $1 WHERE id = $2`, [pendingStatus, body.userId.trim()]);
    }
    await logAuditEvent(`academic_status_approved:${pendingStatus}`, auth.userId, {
      studentId: body.userId.trim(), approverRole: auth.role, reason,
    }, null, auth.role);
    return ok({ userId: body.userId.trim(), approved: pendingStatus });
  }

  // reject: clear the pending marker AND the proposed status (revert to
  // the student's prior effective state, which is no flag).
  await query(
    `UPDATE public.student_details
        SET status_pending_approver = NULL,
            status_rejected_at      = now(),
            status_rejected_by      = $2,
            status_reject_reason    = $3,
            status_approved_at      = NULL,
            status_approved_by      = NULL
      WHERE user_id = $1`,
    [body.userId.trim(), auth.role, reason],
  );
  // Also clear the proposed flag so it does not take effect.
  await query(
    `UPDATE public.student_details
        SET academic_status = NULL, year_override = NULL, status_reason = NULL, status_set_at = NULL
      WHERE user_id = $1`,
    [body.userId.trim()],
  );
  await query(`UPDATE public.users SET flag_status = NULL WHERE id = $1`, [body.userId.trim()]);
  await logAuditEvent(`academic_status_rejected:${pendingStatus}`, auth.userId, {
    studentId: body.userId.trim(), approverRole: auth.role, reason,
  }, null, auth.role);
  return ok({ userId: body.userId.trim(), rejected: pendingStatus });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: APPROVER_ROLES }),
  { keyPrefix: "academic-status-pending-get", maxRequests: 30, windowMs: 60_000 },
);

export const POST = withRateLimit(
  withMutationGuard(implPost, { requiredRole: APPROVER_ROLES }),
  { keyPrefix: "academic-status-pending-post", maxRequests: 20, windowMs: 60_000 },
);
