import { NextRequest } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { logAuditEvent } from "@/middleware/authorization";
import type { FacultyAssignment } from "@/contracts/classes";

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

function getAssignmentId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1] ?? "");
}

// Contract: src/contracts/classes.ts  (hod|admin scope, input: void, output: null)
// Soft-delete: set is_active = FALSE.
// Scope = caller.department_id must own the department of the class this
// assignment belongs to (JOIN classes); admin/sysadmin bypass.
export const DELETE = withMutationGuard(
  async (req: NextRequest, { auth }) => {
    try {
      const assignmentId = getAssignmentId(req);
      if (!assignmentId) {
        return fail("MISSING_PARAM", "Faculty assignment id required", 400);
      }

      // Load the assignment and its class department (for scope + audit).
      const found = await query(
        `SELECT fa.id, fa.faculty_id, fa.class_id, fa.subject_code, fa.role,
                fa.assigned_by, fa.assigned_at, fa.is_active, c.department_id
           FROM public.faculty_assignments fa
           JOIN public.classes c ON c.id = fa.class_id
          WHERE fa.id::text = $1 LIMIT 1`,
        [assignmentId]
      );
      if (found.rows.length === 0) {
        return fail("NOT_FOUND", "Faculty assignment not found", 404);
      }
      const row: any = found.rows[0];
      const targetDepartmentId: string = row.department_id;
      const existing = rowToFacultyAssignment(row);

      // HOD scope: caller's department must own the class's department.
      // admin/sysadmin bypass.
      if (auth.role === "hod" && auth.departmentId !== targetDepartmentId) {
        return fail("FORBIDDEN", "HOD may only unassign faculty within their own department", 403);
      }

      // Soft-delete: mark inactive.
      await query(
        `UPDATE public.faculty_assignments
            SET is_active = FALSE
          WHERE id::text = $1`,
        [assignmentId]
      );

      await logAuditEvent(
        "FACULTY_UNASSIGNED",
        auth.userId,
        {
          assignmentId: existing.id,
          facultyId: existing.facultyId,
          classId: existing.classId,
          subjectCode: existing.subjectCode,
          targetDepartmentId,
        }
      );
      return ok(null);
    } catch (err) {
      console.error("[DELETE /api/faculty-assignments/[id]]", err);
      return fail("INTERNAL_ERROR", "Internal server error", 500);
    }
  },
  { requiredRole: ["hod", "admin", "sysadmin"] }
);
