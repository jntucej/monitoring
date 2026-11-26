// src/app/api/academic-status/route.ts
// HOD academic status management with two-person rule:
//
// GET  /api/academic-status?department=CSE
//      → class-wise roster with per-student academic_status
//      → HOD sees only their department; admin/sysadmin see all
//
// POST /api/academic-status
//      { userId: string, academicStatus: "SUSPENDED"|"DEBARRED"|"LATERAL_JOIN"|null,
//        yearOverride?: number, reason?: string, approve?: boolean }
//      → HOD may only flag students in their own department;
//        admin/sysadmin may flag anyone.
//      → Two-person rule: DEBARRED and SUSPENDED set by a HOD land in
//        PENDING state (student keeps gate access). A dean / principal /
//        vice_principal / chief_warden / admin / sysadmin approves with
//        { userId, approve: true, reason }. Only after approval does
//        users.flag_status sync and the gate sees the flag.
//      → Clears a status by sending academicStatus: null (any role that
//        may set it may clear it).
//
// GET  /api/academic-status/pending
//      → list of pending DEBARRED/SUSPENDED flags awaiting approval,
//        scoped to the approver's authority (admin/sysadmin see all;
//        dean/principal see their relevant scope).

import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { logAuditEvent } from "@/middleware/authorization";
import type { AuthContext } from "@/lib/authContext";

const VALID_STATUS = new Set(["SUSPENDED", "DEBARRED", "LATERAL_JOIN"]);
const TWO_PERSON_STATUS = new Set(["DEBARRED", "SUSPENDED"]);
const APPROVER_ROLES = new Set(["dean", "principal", "vice_principal", "chief_warden", "admin", "sysadmin"]);

interface RosterRow {
  user_id: string;
  roll: string;
  name: string;
  year: number | null;
  section: string | null;
  department: string | null;
  year_override: number | null;
  effective_year: number | null;
  academic_status: string | null;
  status_reason: string | null;
  status_set_at: string | null;
}

const ROSTER_SQL = `SELECT u.id AS user_id, u.unique_id AS roll, u.name,
               sd.year, sd.section, sd.department,
               sd.year_override,
               COALESCE(sd.year_override, sd.year) AS effective_year,
               sd.academic_status, sd.status_reason, sd.status_set_at
          FROM public.users u
          LEFT JOIN public.student_details sd ON sd.user_id = u.id
         WHERE u.role = 'student'
           AND u.status = 'ACTIVE'`;

async function implGet(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const deptParam = req.nextUrl.searchParams.get("department")?.trim().toUpperCase() || null;

  // HOD is restricted to their own department; admin/sysadmin can query any or all.
  let deptFilter: string | null = null;
  if (auth.role === "hod") {
    deptFilter = auth.departmentId ?? null;
    if (!deptFilter) return fail("FORBIDDEN", "HOD account has no department scope", 403);
  } else if (auth.role === "admin" || auth.role === "sysadmin") {
    deptFilter = deptParam;
  } else {
    return fail("FORBIDDEN", "Insufficient permissions", 403);
  }

  const { rows } = deptFilter
    ? await query<RosterRow>(ROSTER_SQL + ` AND sd.department = $1 ORDER BY sd.year, sd.section, u.name`, [deptFilter])
    : await query<RosterRow>(ROSTER_SQL + ` ORDER BY sd.department, sd.year, sd.section, u.name`);

  // Group by (department, effective year, section) → class-wise view
  const byClass = new Map<string, { key: string; department: string | null; year: number | null; section: string | null; students: RosterRow[]; flagged: number }>();
  for (const r of rows) {
    const key = `${r.department ?? "?"}:${r.effective_year ?? "?"}:${r.section ?? "?"}`;
    if (!byClass.has(key)) {
      byClass.set(key, { key, department: r.department, year: r.effective_year, section: r.section, students: [], flagged: 0 });
    }
    const g = byClass.get(key)!;
    g.students.push(r);
    if (r.academic_status) g.flagged += 1;
  }

  return ok({
    department: deptFilter,
    totalStudents: rows.length,
    totalFlagged: rows.filter((r) => r.academic_status).length,
    byClass: [...byClass.values()].map((g) => ({
      department: g.department,
      year: g.year,
      section: g.section,
      count: g.students.length,
      flagged: g.flagged,
      students: g.students.map((s) => ({
        userId: s.user_id,
        roll: s.roll,
        name: s.name,
        year: s.year,
        section: s.section,
        department: s.department,
        yearOverride: s.year_override,
        effectiveYear: s.effective_year,
        academicStatus: s.academic_status,
        statusReason: s.status_reason,
        statusSetAt: s.status_set_at,
      })),
    })),
  });
}

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const body = (await req.json().catch(() => null)) as {
    userId?: string;
    academicStatus?: string | null;
    yearOverride?: number | null;
    reason?: string;
    approve?: boolean;
  } | null;

  if (!body || typeof body.userId !== "string" || !body.userId.trim()) {
    return fail("VALIDATION_ERROR", "userId is required", 400);
  }

  let status: string | null = null;
  if (body.academicStatus !== null && body.academicStatus !== undefined) {
    const s = String(body.academicStatus).toUpperCase();
    if (!VALID_STATUS.has(s)) {
      return fail("VALIDATION_ERROR", `academicStatus must be one of: ${[...VALID_STATUS].join(", ")}`, 400);
    }
    status = s;
  }

  let yearOverride: number | null = null;
  if (body.yearOverride !== null && body.yearOverride !== undefined) {
    if (!Number.isInteger(body.yearOverride) || body.yearOverride < 1) {
      return fail("VALIDATION_ERROR", "yearOverride must be a positive integer", 400);
    }
    yearOverride = body.yearOverride;
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() || null : null;

  // Fetch the target student
  const { rows: target } = await query<{ id: string; department: string | null }>(
    `SELECT u.id, sd.department
       FROM public.users u
       LEFT JOIN public.student_details sd ON sd.user_id = u.id
      WHERE u.id = $1 AND u.role = 'student'
      LIMIT 1`,
    [body.userId.trim()],
  );
  if (target.length === 0) {
    return fail("NOT_FOUND", "Student not found", 404);
  }
  const student = target[0];

  // HOD scope: must match their own department
  if (auth.role === "hod") {
    if (!auth.departmentId) return fail("FORBIDDEN", "HOD account has no department scope", 403);
    if (student.department !== auth.departmentId) {
      return fail("FORBIDDEN", "HOD may only manage students in their own department", 403);
    }
  }

  // ---- Two-person rule ----
  // If an approver is approving/rejecting a pending status, do that.
  if (body.approve === true) {
    if (!APPROVER_ROLES.has(auth.role)) {
      return fail("FORBIDDEN", "Approval requires dean / principal / vice_principal / chief_warden / admin / sysadmin", 403);
    }
    const { rows: pend } = await query<{ academic_status: string | null; status_pending_approver: string | null }>(
      `SELECT academic_status, status_pending_approver FROM public.student_details WHERE user_id = $1`,
      [body.userId.trim()],
    );
    if (!pend.length || !pend[0].status_pending_approver) {
      return fail("VALIDATION_ERROR", "No pending status to approve for this student", 400);
    }
    const pendingStatus = pend[0].academic_status;
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
    // Now sync the flag so gate + RLS see it.
    if (pendingStatus) {
      await query(`UPDATE public.users SET flag_status = $1 WHERE id = $2`, [pendingStatus, body.userId.trim()]);
    }
    await logAuditEvent(`academic_status_approved:${pendingStatus}`, auth.userId, {
      studentId: body.userId.trim(), approverRole: auth.role, reason,
    }, null, auth.role);
    return ok({ userId: body.userId.trim(), approved: pendingStatus });
  }

  // Normal set / clear path.
  await query(
    `UPDATE public.student_details
        SET academic_status = $1,
            year_override   = $2,
            status_reason   = $3,
            status_set_at   = CASE WHEN $1::text IS NOT NULL THEN now() ELSE NULL END
      WHERE user_id = $4`,
    [status, status === "LATERAL_JOIN" || status === "DEBARRED" ? yearOverride : null, reason, body.userId.trim()],
  );

  // Two-person rule: HOD (or any non-approver role) setting DEBARRED /
  // SUSPENDED parks it in pending state; flag_status is NOT synced yet.
  const isTwoPerson = status !== null && TWO_PERSON_STATUS.has(status) && !APPROVER_ROLES.has(auth.role);
  if (isTwoPerson) {
    await query(
      `UPDATE public.student_details
          SET status_pending_approver = $1,
              status_approved_at = NULL, status_approved_by = NULL
        WHERE user_id = $2`,
      [status, body.userId.trim()],
    );
    await logAuditEvent(`academic_status_pending:${status}`, auth.userId, {
      studentId: body.userId.trim(), setterRole: auth.role, reason,
    }, null, auth.role);
    return ok({ userId: body.userId.trim(), academicStatus: status, pending: true });
  }

  // Sync users.flag_status so gate scanner + RLS see the flag
  if (status) {
    await query(`UPDATE public.users SET flag_status = $1 WHERE id = $2`, [status, body.userId.trim()]);
  } else {
    await query(`UPDATE public.users SET flag_status = NULL WHERE id = $1`, [body.userId.trim()]);
  }

  await logAuditEvent(
    status ? `academic_status_set:${status}` : "academic_status_cleared",
    auth.userId,
    { studentId: body.userId.trim(), yearOverride, reason },
    null,
    auth.role,
  );

  return ok({ userId: body.userId.trim(), academicStatus: status, yearOverride });
}

// ---- Pending queue: approvers see what's waiting for two-person sign-off ----
async function implGetPending(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;

  // admin/sysadmin see everything; dean/principal/vice_principal/
  // chief_warden see the queue (they are the approver set).
  if (!APPROVER_ROLES.has(auth.role)) {
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

  return ok({ pending: rows.map((r) => ({
    userId: r.user_id, roll: r.roll, name: r.name,
    department: r.department, status: r.academic_status,
    reason: r.status_reason, setAt: r.status_set_at,
  })) });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["hod", "admin", "sysadmin"] }),
  { keyPrefix: "academic-status-get", maxRequests: 30, windowMs: 60_000 },
);

export const POST = withApiChain(implPost, {
  route: "/api/academic-status",
  auth: "user",
  csrf: true,
  requiredRole: ["hod", "dean", "principal", "vice_principal", "chief_warden", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "academic-status-post", maxRequests: 20, windowMs: 60_000 },
});
