// src/app/api/class-coordinators/route.ts
// GET  /api/class-coordinators?classId= — roster + status for a class.
// POST /api/class-coordinators — appoint a coordinator (tier 2).
//   Authority: class_teacher of that class, OR HOD of the class's dept, OR admin.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { query } from "@/lib/postgres";
import { getActiveCoordinators, appointCoordinator } from "@/lib/class-coordinator";

async function implGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const allowed = ["faculty", "hod", "vice_principal", "admin", "sysadmin", "student"];
  if (!allowed.includes(auth.role)) {
    return fail("FORBIDDEN", "Not permitted to view coordinators", 403);
  }
  const classId = req.nextUrl.searchParams.get("classId");
  if (!classId) return fail("VALIDATION_ERROR", "classId required", 400);
  const { rows: cls } = await query<{ name: string }>(
    `SELECT name FROM public.classes WHERE id = $1::uuid LIMIT 1`, [classId]);
  if (cls.length === 0) return fail("NOT_FOUND", "Class not found", 404);
  const coordinators = await getActiveCoordinators(cls[0].name);
  return ok(coordinators);
}

async function implPost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const body = await req.json().catch(() => null);
  if (!body?.classId || !body?.studentId || !body?.validTo) {
    return fail("VALIDATION_ERROR", "classId, studentId, validTo are required", 400);
  }
  const { rows: cls } = await query<{ name: string; department_id: string; class_teacher_id: string | null }>(
    `SELECT name, department_id, class_teacher_id FROM public.classes WHERE id = $1::uuid LIMIT 1`,
    [body.classId],
  );
  if (cls.length === 0) return fail("NOT_FOUND", "Class not found", 404);
  const classRow = cls[0];

  // Authority: the class teacher, HOD of the dept, or admin/sysadmin.
  // user_roles has no scope in this schema; HOD authority is by role +
  // department match on the users table.
  const isClassTeacher = classRow.class_teacher_id === auth.userId;
  const isHod = auth.role === "hod";
  const isPriv = auth.role === "admin" || auth.role === "sysadmin";
  if (!isClassTeacher && !isHod && !isPriv) {
    return fail("FORBIDDEN", "Only the class teacher, department HOD, or admin may appoint a coordinator", 403);
  }

  // Verify the appointee is a student.
  const { rows: stud } = await query<{ role: string }>(
    `SELECT role FROM public.users WHERE id = $1::uuid`, [body.studentId]);
  if (stud.length === 0 || stud[0].role !== "student") {
    return fail("VALIDATION_ERROR", "Appointee must be a student", 400);
  }

  const result = await appointCoordinator({
    studentId: body.studentId,
    scopeId: classRow.name,
    validTo: body.validTo,
    appointedById: auth.userId,
    appointedRole: auth.role,
  });
  return ok(result);
}

export const GET = withAuthorization(implGet, {});
export const POST = withAuthorization(implPost, {});
