import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { logAuditEvent } from "@/middleware/authorization";
import type { FacultyAssignment, AssignInput } from "@/contracts/classes";

// READ — src/app/api/faculty-assignments/route.ts
// Contract: hod|self|admin scope, output: FacultyAssignment[].
//   - admin/sysadmin → all assignments
//   - HOD           → assignments whose class belongs to the caller's department
//   - faculty       → only their own (self) active + historical assignments
export const GET = withRateLimit(
  withAuthorization(async (req: NextRequest, { auth }) => {
    try {
      const isAdmin = auth.role === "admin" || auth.role === "sysadmin";
      const isHod = auth.role === "hod";
      const activeOnly = req.nextUrl.searchParams.get("active") === "true";

      let sql =
        `SELECT fa.id, fa.faculty_id, fa.class_id, fa.subject_code, fa.role, fa.assigned_by, fa.assigned_at, fa.is_active
           FROM public.faculty_assignments fa`;
      const params: unknown[] = [];
      const where: string[] = [];

      if (!isAdmin && !isHod) {
        // faculty caller: their own assignments only (self scope).
        where.push(`fa.faculty_id::text = $${params.length + 1}`);
        params.push(auth.userId);
      } else if (isHod) {
        // HOD: assignments on classes within the caller's department.
        where.push(`c.department_id = $${params.length + 1}`);
        params.push(auth.departmentId ?? "");
        sql = `SELECT fa.id, fa.faculty_id, fa.class_id, fa.subject_code, fa.role, fa.assigned_by, fa.assigned_at, fa.is_active
                FROM public.faculty_assignments fa
                JOIN public.classes c ON c.id = fa.class_id`;
      } else {
        sql = `SELECT fa.id, fa.faculty_id, fa.class_id, fa.subject_code, fa.role, fa.assigned_by, fa.assigned_at, fa.is_active
                FROM public.faculty_assignments fa`;
      }

      if (activeOnly) where.push(`fa.is_active = TRUE`);
      if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
      sql += ` ORDER BY fa.assigned_at DESC`;

      const res = await query<{ id: string; faculty_id: string; class_id: string; subject_code: string; role: FacultyAssignment["role"]; assigned_by: string | null; assigned_at: string; is_active: boolean }>(sql, params as string[]);
      return ok(res.rows.map(rowToFacultyAssignment));
    } catch {
      return fail("INTERNAL_ERROR", "Internal server error", 500);
    }
  }, { requiredRole: ["hod", "faculty", "admin", "sysadmin"] }),
  { keyPrefix: "faculty_assignments", maxRequests: 30, windowMs: 60_000 }
);

function rowToFacultyAssignment(row: any): FacultyAssignment {
  return {
    id: row.id,
    facultyId: row.faculty_id,
    classId: row.class_id,
    subjectCode: row.subject_code,
    role: row.role,
    assignedBy: row.assigned_by ?? null,
    assignedAt: row.assigned_at,
    isActive: Boolean(row.is_active),
  };
}

const ASSIGN_ROLES: AssignInput["role"][] = ["subject_faculty", "assistant"];

// Contract: src/contracts/classes.ts  (hod|admin scope, input: AssignInput)
// Scope = caller.department_id must match the class's department_id (HOD);
// admin/sysadmin bypass.
export const POST = withMutationGuard(
  async (req: NextRequest, { auth }) => {
    try {
      const body: unknown = await req.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return fail("INVALID_BODY", "Request body must be a JSON object", 400);
      }
      const input = body as Partial<AssignInput>;

      const facultyId =
        typeof input.facultyId === "string" && input.facultyId.trim() !== ""
          ? input.facultyId.trim()
          : null;
      if (facultyId === null) {
        return fail("VALIDATION_ERROR", "facultyId is required", 400);
      }
      const classId =
        typeof input.classId === "string" && input.classId.trim() !== ""
          ? input.classId.trim()
          : null;
      if (classId === null) {
        return fail("VALIDATION_ERROR", "classId is required", 400);
      }
      const subjectCode =
        typeof input.subjectCode === "string" && input.subjectCode.trim() !== ""
          ? input.subjectCode.trim()
          : null;
      if (subjectCode === null) {
        return fail("VALIDATION_ERROR", "subjectCode is required", 400);
      }
      const role =
        input.role === "subject_faculty" || input.role === "assistant"
          ? input.role
          : null;
      if (role === null) {
        return fail("VALIDATION_ERROR", "role must be 'subject_faculty' or 'assistant'", 400);
      }
      void ASSIGN_ROLES;

      // Verify the faculty user exists and is role='faculty' (or caller is
      // admin/sysadmin creating on their behalf).
      const facultyCheck = await query(
        `SELECT id, role FROM public.users WHERE id::text = $1 LIMIT 1`,
        [facultyId]
      );
      if (facultyCheck.rows.length === 0) {
        return fail("NOT_FOUND", "Faculty user not found", 404);
      }
      const facultyRole: string = facultyCheck.rows[0].role;
      const isAdminCaller = auth.role === "admin" || auth.role === "sysadmin";
      if (facultyRole !== "faculty" && !isAdminCaller) {
        return fail("VALIDATION_ERROR", "Target user is not faculty", 400);
      }

      // Verify the class exists and grab its department for scope.
      const classCheck = await query(
        `SELECT c.id, c.department_id FROM public.classes c WHERE c.id::text = $1 LIMIT 1`,
        [classId]
      );
      if (classCheck.rows.length === 0) {
        return fail("NOT_FOUND", "Class not found", 404);
      }
      const classDepartmentId: string = classCheck.rows[0].department_id;

      // HOD scope: caller's department must match the class's department.
      // admin/sysadmin bypass.
      if (auth.role === "hod" && auth.departmentId !== classDepartmentId) {
        return fail("FORBIDDEN", "HOD may only assign faculty within their own department", 403);
      }

      // Guard against an already-active duplicate before insert.
      const dup = await query(
        `SELECT 1 FROM public.faculty_assignments
          WHERE faculty_id::text = $1 AND class_id::text = $2
            AND subject_code = $3 AND is_active = TRUE LIMIT 1`,
        [facultyId, classId, subjectCode]
      );
      if (dup.rows.length > 0) {
        return fail("DUPLICATE_ASSIGNMENT", "Already assigned", 409);
      }

      const { rows } = await query<FacultyAssignment>(
        `INSERT INTO public.faculty_assignments
           (id, faculty_id, class_id, subject_code, role, assigned_by)
         VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5::uuid)
         RETURNING id, faculty_id, class_id, subject_code, role,
                   assigned_by, assigned_at, is_active`,
        [facultyId, classId, subjectCode, role, auth.userId]
      ).catch((err: any) => {
        if (err?.code === "23505") {
          return { rows: [] } as { rows: FacultyAssignment[] };
        }
        throw err;
      });
      if (rows.length === 0) {
        return fail("DUPLICATE_ASSIGNMENT", "Already assigned", 409);
      }
      const created = rowToFacultyAssignment(rows[0]);

      await logAuditEvent(
        "FACULTY_ASSIGNED",
        auth.userId,
        { facultyId, classId, subjectCode, role, classDepartmentId }
      );
      return ok(created);
    } catch (err) {
      console.error("[POST /api/faculty-assignments]", err);
      return fail("INTERNAL_ERROR", "Internal server error", 500);
    }
  },
  { requiredRole: ["hod", "admin", "sysadmin"] }
);
