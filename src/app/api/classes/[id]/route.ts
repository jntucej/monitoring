import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { logAuditEvent } from "@/middleware/authorization";
import type { ClassRow, UpdateClassInput } from "@/contracts/classes";

// READ — src/app/api/classes/[id]/route.ts
// Contract: src/contracts/classes.ts  (hod|faculty|admin scope)
// Load the class by id (404 if absent). HOD: 403 unless the class's
// department matches their own. Faculty: 403 unless they are the class
// teacher OR hold an active assignment to this class. Admin/sysadmin bypass.
export const GET = withRateLimit(
  withAuthorization(async (req: NextRequest, { auth }) => {
    try {
      const classId = getClassId(req);
      if (!classId) return fail("MISSING_PARAM", "Class id required", 400);

      // Load the class first; 404 before any scope check.
      const { rows } = await query<ClassRow>(
        `SELECT id, department_id, year, section, name, class_teacher_id,
                room_number, capacity, is_active, created_at, updated_at
           FROM public.classes
          WHERE id::text = $1 LIMIT 1`,
        [classId]
      );
      if (rows.length === 0) {
        return fail("NOT_FOUND", "Class not found", 404);
      }
      const dbRow = rows[0] as unknown as Record<string, any>;
      const classRow = rowToClassRow(dbRow);
      const callerIsAdmin = auth.role === "admin" || auth.role === "sysadmin";

      if (callerIsAdmin) {
        return ok(classRow);
      }

      if (auth.role === "hod") {
        // HOD may only read classes inside their own department.
        if (classRow.departmentId !== auth.departmentId) {
          return fail("FORBIDDEN", "HOD may only read classes within their own department", 403);
        }
        return ok(classRow);
      }

      // Faculty: permitted only as class teacher OR active assignment holder.
      if (classRow.classTeacherId === auth.userId) {
        return ok(classRow);
      }
      const assigned = await query(
        `SELECT 1 FROM public.faculty_assignments
          WHERE faculty_id::text = $1
            AND class_id::text = $2
            AND is_active
          LIMIT 1`,
        [auth.userId, classId]
      );
      if (assigned.rows.length === 0) {
        return fail("FORBIDDEN", "Caller is not a teacher or assigned faculty for this class", 403);
      }
      return ok(classRow);
    } catch {
      return fail("INTERNAL_ERROR", "Internal server error", 500);
    }
  }, { requiredRole: ["hod", "faculty", "admin", "sysadmin"] }),
  { keyPrefix: "class_id", maxRequests: 30, windowMs: 60_000 }
);

function getClassId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1] ?? "");
}

function rowToClassRow(row: any): ClassRow {
  return {
    id: row.id,
    departmentId: row.department_id,
    year: Number(row.year),
    section: row.section,
    name: row.name ?? null,
    classTeacherId: row.class_teacher_id ?? null,
    roomNumber: row.room_number ?? null,
    capacity: row.capacity == null ? null : Number(row.capacity),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// SCARFOLD:WRITE — PATCH src/app/api/classes/[id]/route.ts
// Contract: src/contracts/classes.ts  (hod|admin scope, input: UpdateClassInput)
// Scope = caller.department_id must match target.department_id (HOD);
// admin/sysadmin bypass.
export const PATCH = withMutationGuard(
  async (req: NextRequest, { auth }) => {
    try {
      const classId = getClassId(req);
      if (!classId) return fail("MISSING_PARAM", "Class id required", 400);

      const body: unknown = await req.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return fail("INVALID_BODY", "Request body must be a JSON object", 400);
      }
      const input = body as Partial<UpdateClassInput>;

      // Load the target class first (NOT_FOUND before scope/other validation).
      const found = await query(
        `SELECT id, department_id FROM public.classes WHERE id::text = $1 LIMIT 1`,
        [classId]
      );
      if (found.rows.length === 0) {
        return fail("NOT_FOUND", "Class not found", 404);
      }
      const targetDepartmentId: string = found.rows[0].department_id;

      // HOD scope: caller's department must own the class's department.
      // admin/sysadmin bypass.
      if (auth.role === "hod" && auth.departmentId !== targetDepartmentId) {
        return fail("FORBIDDEN", "HOD may only update classes within their own department", 403);
      }

      // Build the partial UPDATE from provided fields only.
      const setClause: string[] = [];
      const params: any[] = [classId];
      if (input.classTeacherId !== undefined) {
        params.push(input.classTeacherId);
        setClause.push(`class_teacher_id = $${params.length}::uuid`);
      }
      if (input.name !== undefined) {
        params.push(input.name === null ? null : String(input.name));
        setClause.push(`name = $${params.length}`);
      }
      if (input.roomNumber !== undefined) {
        params.push(input.roomNumber === null ? null : String(input.roomNumber));
        setClause.push(`room_number = $${params.length}`);
      }
      if (input.capacity !== undefined) {
        if (input.capacity !== null && (!Number.isInteger(input.capacity) || input.capacity < 0)) {
          return fail("VALIDATION_ERROR", "capacity must be a non-negative integer", 400);
        }
        params.push(input.capacity);
        setClause.push(`capacity = $${params.length}`);
      }
      if (input.isActive !== undefined) {
        params.push(Boolean(input.isActive));
        setClause.push(`is_active = $${params.length}`);
      }

      const { rows } = setClause.length > 0
        ? await query<ClassRow>(
            `UPDATE public.classes
               SET ${setClause.join(", ")}
             WHERE id::text = $1
             RETURNING id, department_id, year, section, name, class_teacher_id,
                       room_number, capacity, is_active, created_at, updated_at`,
            [classId]
          )
        : await query<ClassRow>(
            `SELECT id, department_id, year, section, name, class_teacher_id,
                    room_number, capacity, is_active, created_at, updated_at
               FROM public.classes WHERE id::text = $1`,
            [classId]
          );

      if (rows.length === 0) {
        return fail("NOT_FOUND", "Class not found", 404);
      }
      const updated = rowToClassRow(rows[0]);

      await logAuditEvent(
        "CLASS_UPDATED",
        auth.userId,
        { classId, changes: input, targetDepartmentId }
      );
      return ok(updated);
    } catch (err) {
      console.error("[PATCH /api/classes/[id]]", err);
      return fail("INTERNAL_ERROR", "Internal server error", 500);
    }
  },
  { requiredRole: ["hod", "admin"] }
);
