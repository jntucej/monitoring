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
 * URL path for /api/departments/<dept>/classes → <dept>
 * (UUID or department code). Decoded.
 */
function getDeptParam(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  // .../departments/<dept>/classes  →  <dept> is segments[-2]
  const idx = segments.length - 2;
  return idx >= 0 ? decodeURIComponent(segments[idx] ?? "") : "";
}

// READ — src/app/api/departments/[dept]/classes/route.ts
// Contract: src/contracts/classes.ts  (hod|admin scope)
// Resolve the department (UUID or code, 404 if unknown), then list its
// active classes. HOD callers may only read their own department;
// admin/sysadmin bypass.
export const GET = withRateLimit(
  withAuthorization(async (req: NextRequest, { auth }) => {
    try {
      const dept = getDeptParam(req);
      if (!dept) return fail("BAD_REQUEST", "Department identifier missing", 400);

      // 1) Load the department by id OR code; 404 if unknown.
      const deptRes = await query<{ id: string; code: string }>(
        `SELECT id, code FROM public.departments
          WHERE id::text = $1 OR code = $2
          LIMIT 1`,
        [dept, dept]
      );
      if (deptRes.rows.length === 0) {
        return fail("NOT_FOUND", "Department not found", 404);
      }
      const targetDept = deptRes.rows[0];

      // 2) Scope check: HOD may only read their own department.
      const callerIsAdmin = auth.role === "admin" || auth.role === "sysadmin";
      if (!callerIsAdmin && auth.role === "hod") {
        // auth.departmentId stores the department CODE (TEXT) — the class
        // table's department_id is also the code.
        if (auth.departmentId !== targetDept.code && auth.departmentId !== targetDept.id) {
          return fail("FORBIDDEN", "HOD may only read classes within their own department", 403);
        }
      }

      // 3) List the department's active classes.
      const res = await query<ClassesDbRow>(
        `SELECT id, department_id, year, section, name, class_teacher_id,
                room_number, capacity, is_active, created_at, updated_at
           FROM public.classes
          WHERE department_id = $1 AND is_active
          ORDER BY year, section`,
        [targetDept.code]
      );

      return ok(res.rows.map(toClassRow));
    } catch {
      return fail("INTERNAL_ERROR", "Internal server error", 500);
    }
  }, { requiredRole: ["hod", "admin", "sysadmin"] }),
  { keyPrefix: "dept_classes", maxRequests: 30, windowMs: 60_000 }
);
