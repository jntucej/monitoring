// src/app/api/class-coordinators/route.ts
// GET  /api/class-coordinators?classId= — roster + status for a class.
// POST /api/class-coordinators — appoint a coordinator (tier 2).
//   Authority: class_teacher of that class, OR HOD of the class's dept, OR admin.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withMutationGuard } from "@/server/http/mutation-guard";
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
  // classId may be a class uuid OR a department code (empty classes table).
  const { rows: cls } = await query<{ name: string }>(
    `SELECT name FROM public.classes
       WHERE ($1 ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              AND id = $1::uuid)
          OR department_id = $1
       LIMIT 1`,
    [classId],
  );
  // Fallback: treat classId as a class-identity token directly (no class row).
  const scopeToken = cls[0]?.name ?? classId;
  const coordinators = await getActiveCoordinators(scopeToken);
  return ok(coordinators);
}

async function implPost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const body = await req.json().catch(() => null);
  if (!body?.classId || !body?.studentId || !body?.validTo) {
    return fail("VALIDATION_ERROR", "classId, studentId, validTo are required", 400);
  }
  // 4-rep model: type (CR|ICR) + constituency (BOYS|GIRLS|null).
  const repType: "CR" | "ICR" | undefined =
    body.representativeType === "ICR" ? "ICR" : body.representativeType === "CR" ? "CR" : undefined;
  const constituency: "BOYS" | "GIRLS" | null | undefined =
    body.constituency === "BOYS" ? "BOYS" : body.constituency === "GIRLS" ? "GIRLS" : body.constituency === "ANY" ? null : undefined;

  // Resolve the class: uuid OR department code (empty classes table).
  const { rows: cls } = await query<{ name: string; department_id: string; class_teacher_id: string | null }>(
    `SELECT name, department_id, class_teacher_id FROM public.classes
       WHERE ($1 ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND id = $1::uuid)
          OR department_id = $1
       LIMIT 1`,
    [body.classId],
  );
  // When no class row exists (empty classes table), the token is the
  // department code used as the scope identity; authority falls to HOD/admin.
  const classRow = cls[0] ?? { name: body.classId, department_id: body.classId, class_teacher_id: null as unknown as string };

  // Authority: the class teacher, HOD of the dept, or admin/sysadmin.
  const isClassTeacher = classRow.class_teacher_id !== null && classRow.class_teacher_id === auth.userId;
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
    representativeType: repType,
    constituency: constituency,
  });
  return ok(result);
}

export const GET = withAuthorization(implGet, {});
export const POST = withMutationGuard(implPost, {});
