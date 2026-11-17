// src/app/api/academic-status/route.ts
// HOD academic status management:
//
// GET  /api/academic-status?department=CSE
//      → class-wise roster with per-student academic_status
//      → HOD sees only their department; admin/sysadmin see all
//
// POST /api/academic-status
//      { userId: string, academicStatus: "SUSPENDED"|"DEBARRED"|"LATERAL_JOIN"|null,
//        yearOverride?: number, reason?: string }
//      → HOD may only flag students in their own department;
//        admin/sysadmin may flag anyone.
//      → clears a status by sending academicStatus: null.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { logAuditEvent } from "@/middleware/authorization";
import type { AuthContext } from "@/lib/authContext";

const VALID_STATUS = new Set(["SUSPENDED", "DEBARRED", "LATERAL_JOIN"]);

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
  const body = (await req.json().catch(() => null)) as {
    userId?: string;
    academicStatus?: string | null;
    yearOverride?: number | null;
    reason?: string;
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

  // Apply the update
  await query(
    `UPDATE public.student_details
        SET academic_status = $1,
            year_override   = $2,
            status_reason   = $3,
            status_set_at   = CASE WHEN $1::text IS NOT NULL THEN now() ELSE NULL END
      WHERE user_id = $4`,
    [status, status === "LATERAL_JOIN" || status === "DEBARRED" ? yearOverride : null, reason, body.userId.trim()],
  );

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

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["hod", "admin", "sysadmin"] }),
  { keyPrefix: "academic-status-get", maxRequests: 30, windowMs: 60_000 },
);

export const POST = withRateLimit(
  withAuthorization(implPost, { requiredRole: ["hod", "admin", "sysadmin"] }),
  { keyPrefix: "academic-status-post", maxRequests: 20, windowMs: 60_000 },
);
