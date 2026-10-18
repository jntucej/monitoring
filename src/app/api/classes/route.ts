import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { logAuditEvent } from "@/middleware/authorization";
import type { ClassRow, CreateClassInput } from "@/contracts/classes";

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

// READ — src/app/api/classes/route.ts
// Contract: src/contracts/classes.ts  (hod|admin scope)
// HOD callers see only their own department's classes; admin/sysadmin see all.
export const GET = withRateLimit(
  withAuthorization(async (_req: NextRequest, { auth }) => {
    try {
      const isAdmin = auth.role === "admin" || auth.role === "sysadmin";

      let rows: ClassesDbRow[];
      if (isAdmin) {
        const res = await query<ClassesDbRow>(
          `SELECT id, department_id, year, section, name, class_teacher_id,
                  room_number, capacity, is_active, created_at, updated_at
             FROM public.classes
            WHERE is_active
            ORDER BY department_id, year, section`,
        );
        rows = res.rows;
      } else {
        if (!auth.departmentId) {
          return fail("FORBIDDEN", "HOD account has no department scope", 403);
        }
        const res = await query<ClassesDbRow>(
          `SELECT id, department_id, year, section, name, class_teacher_id,
                  room_number, capacity, is_active, created_at, updated_at
             FROM public.classes
            WHERE department_id = $1 AND is_active
            ORDER BY year, section`,
          [auth.departmentId],
        );
        rows = res.rows;
      }

      return ok(rows.map(toClassRow));
    } catch {
      return fail("INTERNAL_ERROR", "Internal server error", 500);
    }
  }, { requiredRole: ["hod", "admin", "sysadmin"] }),
  { keyPrefix: "classes", maxRequests: 30, windowMs: 60_000 }
);

// WRITE — POST src/app/api/classes/route.ts
// Contract: src/contracts/classes.ts  (hod|admin scope, input: CreateClassInput)
// Scope = caller.department_id must match target.department_id (HOD);
// admin/sysadmin bypass.
export const POST = withMutationGuard(
  async (req: NextRequest, { auth }) => {
    try {
      const body: unknown = await req.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return fail("INVALID_BODY", "Request body must be a JSON object", 400);
      }
      const input = body as Partial<CreateClassInput>;

      const departmentId =
        typeof input.departmentId === "string" && input.departmentId.trim() !== ""
          ? input.departmentId.trim()
          : null;
      if (departmentId === null) {
        return fail("VALIDATION_ERROR", "departmentId is required", 400);
      }
      if (
        input.year === undefined ||
        typeof input.year !== "number" ||
        !Number.isInteger(input.year) ||
        input.year <= 0
      ) {
        return fail("VALIDATION_ERROR", "year must be a positive integer", 400);
      }
      const section =
        typeof input.section === "string" && input.section.trim() !== ""
          ? input.section.trim()
          : null;
      if (section === null) {
        return fail("VALIDATION_ERROR", "section is required", 400);
      }
      const name =
        input.name !== undefined && input.name !== null
          ? String(input.name).trim() || null
          : null;
      const roomNumber =
        input.roomNumber !== undefined && input.roomNumber !== null
          ? String(input.roomNumber).trim() || null
          : null;
      const capacity =
        input.capacity !== undefined && input.capacity !== null
          ? Number(input.capacity)
          : null;
      if (capacity !== null && (!Number.isInteger(capacity) || capacity < 0)) {
        return fail("VALIDATION_ERROR", "capacity must be a non-negative integer", 400);
      }

      // HOD scope: caller's department must match the target department.
      // admin/sysadmin bypass.
      if (auth.role === "hod" && auth.departmentId !== departmentId) {
        return fail("FORBIDDEN", "HOD may only create classes within their own department", 403);
      }

      const { rows } = await query<ClassesDbRow>(
        `INSERT INTO public.classes
           (id, department_id, year, section, name, room_number, capacity)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
         RETURNING id, department_id, year, section, name, class_teacher_id,
                   room_number, capacity, is_active, created_at, updated_at`,
        [departmentId, input.year, section, name, roomNumber, capacity]
      ).catch((err: any) => {
        // 23505 = unique_violation (department_id, year, section).
        if (err?.code === "23505") {
          return { rows: [] } as { rows: ClassesDbRow[] };
        }
        throw err;
      });
      if (rows.length === 0) {
        return fail("DUPLICATE_CLASS", "Class already exists", 409);
      }
      const created = toClassRow(rows[0]);

      await logAuditEvent(
        "CLASS_CREATED",
        auth.userId,
        { classId: created.id, departmentId, year: input.year, section, name, roomNumber, capacity }
      );
      return ok(created);
    } catch (err) {
      console.error("[POST /api/classes]", err);
      return fail("INTERNAL_ERROR", "Internal server error", 500);
    }
  },
  { requiredRole: ["hod", "admin", "sysadmin"] }
);
