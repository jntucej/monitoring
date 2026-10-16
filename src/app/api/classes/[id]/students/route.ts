"use client";
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { ClassRow } from "@/contracts/classes";

/** snake_case DB row from public.classes. */
interface ClassesDbRow {
  id: string;
  department_id: string;
  year: number;
  section: string;
  name: string | null;
  class_teacher_id: string | null;
  room_number: string | null;
  capacity: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Map a public.classes row (snake_case) → contract ClassRow (camelCase). */
function toClassRow(r: ClassesDbRow): ClassRow {
  return {
    id: r.id,
    departmentId: r.department_id,
    year: r.year,
    section: r.section,
    name: r.name,
    classTeacherId: r.class_teacher_id,
    roomNumber: r.room_number,
    capacity: r.capacity,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * Person-shaped roster row. `year`/`section` are nullable because
 * student_details carries optional year/section; `roll` is the student's
 * roll number.
 */
interface StudentPerson {
  id: string;
  name: string;
  roll: string;
  year: number | null;
  section: string | null;
}

function getSegment(req: NextRequest, fromEnd: number): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - fromEnd] ?? "");
}

// READ — src/app/api/classes/[id]/students/route.ts
// Contract: src/contracts/classes.ts  (hod|faculty|admin scope)
// Load the class (404/403 per contract), then return the roster grouped to
// the class by the (department_id, year, section) tuple — students have no
// direct class FK in this schema, so the class's own dept/year/section are
// the filter. Scope: HOD owns the department; a faculty caller may read the
// roster only as class teacher OR as an active assignment holder; admin/sys
// admin bypass.
export const GET = withRateLimit(
  withAuthorization(async (req: NextRequest, { auth }) => {
    try {
      const classId = getSegment(req, 1); // .../classes/<id>/students → <id>
      if (!classId) return fail("BAD_REQUEST", "Missing class id", 400);

      // 1) Load the class; 404 before any scope check.
      const { rows } = await query<ClassesDbRow>(
        `SELECT id, department_id, year, section, class_teacher_id,
                room_number, capacity, is_active, name, created_at, updated_at
           FROM public.classes
          WHERE id::text = $1 LIMIT 1`,
        [classId]
      );
      if (rows.length === 0) {
        return fail("NOT_FOUND", "Class not found", 404);
      }
      const cls = rows[0];
      const classRow = toClassRow(cls);
      const callerIsAdmin = auth.role === "admin" || auth.role === "sysadmin";

      // 2) Scope check.
      if (!callerIsAdmin) {
        const ownsDept = auth.role === "hod" && cls.department_id === auth.departmentId;
        const isTeacher = cls.class_teacher_id !== null && cls.class_teacher_id === auth.userId;

        let isAssigned = false;
        if (!ownsDept && !isTeacher) {
          const fa = await query(
            `SELECT 1 FROM public.faculty_assignments
              WHERE faculty_id::text = $1
                AND class_id::text = $2
                AND is_active
              LIMIT 1`,
            [auth.userId, classId]
          );
          isAssigned = fa.rows.length > 0;
        }
        if (!ownsDept && !isTeacher && !isAssigned) {
          return fail("FORBIDDEN", "Caller has no access to this class", 403);
        }
      }

      // 3) Roster: students matching the class's (department, year, section).
      // Uses the class's own dept/year/section as the filter (no student↔class
      // FK exists; grouping is by the triple).
      const res = await query<StudentPerson>(
        `SELECT u.id AS id,
                u.name AS name,
                sd.roll AS roll,
                sd.year AS year,
                sd.section AS section
           FROM public.classes c
           JOIN public.users u
             ON u.role = 'student'
            AND u.department_id = c.department_id
           JOIN public.student_details sd ON sd.user_id = u.id
          WHERE c.id = $1
            AND sd.year = c.year
            AND sd.section = c.section
          ORDER BY sd.roll`,
        [classId]
      );

      void classRow;
      return ok(res.rows);
    } catch {
      return fail("INTERNAL_ERROR", "Internal server error", 500);
    }
  }, { requiredRole: ["hod", "faculty", "admin", "sysadmin"] }),
  { keyPrefix: "class_students", maxRequests: 30, windowMs: 60_000 }
);
