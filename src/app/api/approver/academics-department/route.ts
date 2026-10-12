// src/app/api/approver/academics-department/route.ts
// SCAFFOLD:ACADEMICS — real-data join for the academics & department panel.
//
// Joins the same sources the sysadmin / departments panel reads:
//   • public.departments                                → code / name
//   • public.users + public.employee_details          → faculty headcount + HOD
//   • public.users + public.student_details           → student headcount + year heatmap
//   • public.movement_logs                            → on-campus / IN / OUT today
//
// GET   → ok({ data: AcademicsDepartmentPayload })
// PATCH { department, hodName } → atomic HOD reassignment, audited.
//
// Compliance: withAuthorization → requireTrustedHeaders → assertCsrf →
// rate-limit → handler. Standard ok()/fail() envelope (no raw
// NextResponse.json). getSupabaseServiceClient() for all DB access;
// invalidateCache() after the mutation.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { requireTrustedHeaders } from "@/server/http/trusted-headers";
import { assertCsrf } from "@/lib/csrf";
import { addAudit } from "@/lib/db";
import { assertLength } from "@/lib/validation";
import { invalidateCache } from "@/lib/cache";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withTransaction } from "@/lib/postgres";
import { RATE_LIMITS } from "@/config/app-constants";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

/** Roles that may read the academics analytics. */
const READ_ROLES: Role[] = [
  "sysadmin", "admin", "principal", "vice_principal", "exam_branch", "oie", "hod",
];
/** Roles that may reassign an HOD. */
const HOD_EDIT_ROLES: Role[] = ["sysadmin", "admin", "principal"];

/* ──────────────────────────────────────────────────────────────────────── */
/* GET — full department analytics join                                   */
/* ──────────────────────────────────────────────────────────────────────── */

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  const untrusted = requireTrustedHeaders(_req);
  if (untrusted) return untrusted;
  void auth;

  const supabase = getSupabaseServiceClient();

  // Departments (code + name)
  const { data: departments, error: deptErr } = await supabase
    .from("departments")
    .select("code, name");
  if (deptErr) return fail("DEPT_FETCH_FAILED", deptErr.message, 500);

  // Users: role, department, name, email, unique_id, status
  const { data: users, error: usersErr } = await supabase
    .from("users")
    .select("id, role, department_id, name, email, unique_id, status");
  if (usersErr) return fail("USERS_FETCH_FAILED", usersErr.message, 500);

  // Employee details: is_hod + department linkage
  const { data: employees, error: empErr } = await supabase
    .from("employee_details")
    .select("user_id, department_id, is_hod");
  if (empErr) return fail("EMPLOYEES_FETCH_FAILED", empErr.message, 500);

  // Student details: year (for the heatmap)
  const { data: studentDetails, error: sdErr } = await supabase
    .from("student_details")
    .select("user_id, year");
  if (sdErr) return fail("STUDENTS_FETCH_FAILED", sdErr.message, 500);

  // Movement logs for today: IN / OUT presence
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const { data: movements, error: movErr } = await supabase
    .from("movement_logs")
    .select("user_id, direction, created_at")
    .gte("created_at", todayStart);
  if (movErr) return fail("MOVEMENT_FETCH_FAILED", movErr.message, 500);

  const activeUsers = users.filter((u) => u.status === "ACTIVE");
  const studentYear = new Map<string, number | null>(
    (studentDetails ?? []).map((sd) => [sd.user_id, sd.year ?? null]),
  );

  // Latest movement per user today (IN → on campus, OUT → left)
  const latestMovement = new Map<string, "IN" | "OUT">();
  for (const m of (movements ?? []).sort((a, b) =>
    (a.created_at ?? "").localeCompare(b.created_at ?? ""),
  )) {
    if (m.direction === "IN" || m.direction === "OUT") {
      latestMovement.set(m.user_id, m.direction);
    }
  }

  const rows = (departments ?? []).map((dept) => {
    const code = dept.code;

    // Faculty: active users whose role is in the academic set, linked to this dept.
    const faculty = activeUsers.filter(
      (u) =>
        u.department_id === code &&
        ["faculty", "hod", "teaching_faculty", "assistant_professor", "associate_professor", "professor"].includes(u.role),
    );

    // Students: active users with role 'student' linked to this dept.
    const students = activeUsers.filter(
      (u) => u.department_id === code && u.role === "student",
    );

    // HOD: employee_details.is_hod = true for this dept (first match wins).
    const hodEmp = (employees ?? []).find(
      (e) => e.department_id === code && e.is_hod === true,
    );
    const hodUser = hodEmp ? activeUsers.find((u) => u.id === hodEmp.user_id) ?? null : null;

    // Presence today for this dept's people.
    const deptUserIds = new Set(
      activeUsers.filter((u) => u.department_id === code).map((u) => u.id),
    );
    let onCampus = 0;
    let inToday = 0;
    let outToday = 0;
    for (const [uid, dir] of latestMovement) {
      if (!deptUserIds.has(uid)) continue;
      if (dir === "IN") { onCampus += 1; inToday += 1; }
      else { outToday += 1; }
    }

    // Year heatmap (y1..y4 + lateral entry).
    const heatmap = { y1: 0, y2: 0, y3: 0, y4: 0, le: 0 };
    for (const s of students) {
      const yr = studentYear.get(s.id);
      if (yr === 1) heatmap.y1 += 1;
      else if (yr === 2) heatmap.y2 += 1;
      else if (yr === 3) heatmap.y3 += 1;
      else if (yr === 4) heatmap.y4 += 1;
      else heatmap.le += 1;
    }

    const facultyCount = faculty.length;
    const studentCount = students.length;

    return {
      code,
      name: dept.name,
      hod: hodUser
        ? { id: hodUser.id, name: hodUser.name, email: hodUser.email ?? null, uniqueId: hodUser.unique_id ?? null }
        : null,
      facultyCount,
      studentCount,
      ratio: facultyCount > 0 ? Math.round((studentCount / facultyCount) * 10) / 10 : 0,
      onCampus,
      inToday,
      outToday,
      heatmap,
    };
  });

  const totalStudents = rows.reduce((s, r) => s + r.studentCount, 0);
  const totalFaculty  = rows.reduce((s, r) => s + r.facultyCount, 0);

  return ok({
    data: {
      departments: rows,
      totals: {
        departments: rows.length,
        students: totalStudents,
        faculty: totalFaculty,
        ratio: totalFaculty > 0 ? Math.round((totalStudents / totalFaculty) * 10) / 10 : 0,
        live: rows.length > 0,
      },
      generatedAt: new Date().toISOString(),
    },
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: READ_ROLES,
  rateLimit: RATE_LIMITS.read,
} as never);

/* ──────────────────────────────────────────────────────────────────────── */
/* PATCH — reassign HOD (atomic: clear prior, mark new)                   */
/* ──────────────────────────────────────────────────────────────────────── */

async function handlePatch(req: NextRequest, { auth }: { auth: AuthContext }) {
  const untrusted = requireTrustedHeaders(req);
  if (untrusted) return untrusted;

  if (!HOD_EDIT_ROLES.includes(auth.role)) {
    return fail("FORBIDDEN", "Insufficient role to reassign HOD", 403);
  }

  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  let body: unknown;
  try { body = await req.json(); }
  catch { return fail("INVALID_JSON", "body must be JSON", 400); }
  if (!body || typeof body !== "object") {
    return fail("INVALID_BODY", "body must be an object", 400);
  }

  const { department, hodName, hodUserId } = body as {
    department?: unknown; hodName?: unknown; hodUserId?: unknown;
  };
  if (typeof department !== "string" || !department.trim()) {
    return fail("MISSING_DEPARTMENT", "department is required", 400);
  }
  const deptCode = department.trim();
  try { assertLength(deptCode, 32, "department"); }
  catch (e) { return fail("VALIDATION_FAILED", e instanceof Error ? e.message : "invalid", 400); }

  const name = typeof hodName === "string" ? hodName.trim() : "";
  const explicitId = typeof hodUserId === "string" ? hodUserId.trim() : "";

  // Resolve the target user id: prefer explicit hodUserId, else match by name.
  let targetId = explicitId;
  if (!targetId && name) {
    const supabase = getSupabaseServiceClient();
    const { data: match } = await supabase
      .from("users")
      .select("id")
      .ilike("name", name)
      .in("role", ["faculty", "hod", "teaching_faculty", "assistant_professor", "associate_professor", "professor"])
      .eq("status", "ACTIVE")
      .limit(1);
    targetId = match?.[0]?.id ?? "";
    if (!targetId) {
      return fail("USER_NOT_FOUND", `No active academic user named "${name}"`, 404);
    }
  }

  // Atomic swap: clear old HOD flag in this department, set new one.
  await withTransaction(async (db) => {
    await db.query(
      `UPDATE public.employee_details ed
          SET is_hod = FALSE
        WHERE ed.department_id = $1
          AND ed.is_hod = TRUE
          AND ed.user_id <> COALESCE($2, '00000000-0000-0000-0000-000000000000'::uuid)`,
      [deptCode, targetId || null],
    );

    if (targetId) {
      // Upsert employee_details so the flag actually lands somewhere.
      await db.query(
        `INSERT INTO public.employee_details (user_id, department_id, is_hod)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (user_id)
         DO UPDATE SET department_id = EXCLUDED.department_id, is_hod = TRUE`,
        [targetId, deptCode],
      );
    }
  });

  await addAudit({
    action: "DEPARTMENT_HOD_ASSIGNED",
    userId: auth.userId,
    userName: auth.email,
    role: auth.role,
    details: { department: deptCode, hodUserId: targetId || null, hodName: name || null },
  });

  // Bust the read cache so every dashboard reflects the reassignment immediately.
  await invalidateCache("*academics*");
  await invalidateCache("*departments*");

  return ok({ applied: true });
}

export const PATCH = withAuthorization(handlePatch, {
  requiredRole: HOD_EDIT_ROLES,
  rateLimit: RATE_LIMITS.mutation,
} as never);
