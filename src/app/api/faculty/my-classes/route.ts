import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { MyClass } from "@/contracts/classes";

// SCARFOLD:READ — src/app/api/faculty/my-classes/route.ts
// Contract: src/contracts/classes.ts  (faculty scope)
//
// GET /api/faculty/my-classes?role=class_teacher|subject_faculty
// Caller is a faculty user (or admin/sysadmin). The scope is ALWAYS the
// caller's own assignments — they can only see classes they are assigned to.
//
//   ?role=class_teacher    → classes where the caller is the class_teacher
//   ?role=subject_faculty  → classes where the caller has an active subject_faculty
//                            assignment (rows carry subjectCodes)
//   (no role)              → union of both, de-duplicated by class id
//
// All SQL is parameterized.

interface ClassDbRow {
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
  subject_code?: string | null;
}

// Map a DB row to the contract's ClassRow (camelCase) plus optional subjectCodes.
function rowToClass(row: ClassDbRow): MyClass {
  const subjectCodes =
    row.subject_code != null ? [row.subject_code] : undefined;
  return {
    id: row.id,
    departmentId: row.department_id,
    year: row.year,
    section: row.section,
    name: row.name,
    classTeacherId: row.class_teacher_id,
    roomNumber: row.room_number,
    capacity: row.capacity,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(subjectCodes ? { subjectCodes } : {}),
  };
}

async function handleGet(req: NextRequest, { auth }: { auth: { userId: string } }) {
  const userId = auth.userId;
  const role = req.nextUrl.searchParams.get("role");

  try {
    if (role === "class_teacher") {
      const { rows } = await query<ClassDbRow>(
        `SELECT c.*
           FROM public.classes c
          WHERE c.class_teacher_id = $1
            AND c.is_active`,
        [userId]
      );
      return ok(rows.map(rowToClass));
    }

    if (role === "subject_faculty") {
      const { rows } = await query<ClassDbRow>(
        `SELECT c.*, fa.subject_code
           FROM public.classes c
           JOIN public.faculty_assignments fa
             ON fa.class_id = c.id
          WHERE fa.faculty_id = $1
            AND fa.is_active
            AND fa.role = 'subject_faculty'
          ORDER BY c.department_id, c.year, c.section, fa.subject_code`,
        [userId]
      );
      // A faculty may hold multiple subject codes for the same class; group them.
      const byClass = new Map<string, MyClass>();
      for (const row of rows) {
        const base = rowToClass(row);
        const existing = byClass.get(row.id);
        if (existing) {
          if (base.subjectCodes) {
            existing.subjectCodes = [
              ...(existing.subjectCodes || []),
              ...base.subjectCodes,
            ];
          }
        } else {
          byClass.set(row.id, base);
        }
      }
      return ok(Array.from(byClass.values()));
    }

    // Default (no role): union of class_teacher classes + subject_faculty
    // assignments, de-duplicated by class id.
    const [teacherRes, subjectRes] = await Promise.all([
      query<ClassDbRow>(
        `SELECT c.*
           FROM public.classes c
          WHERE c.class_teacher_id = $1
            AND c.is_active`,
        [userId]
      ),
      query<ClassDbRow>(
        `SELECT c.*, fa.subject_code
           FROM public.classes c
           JOIN public.faculty_assignments fa
             ON fa.class_id = c.id
          WHERE fa.faculty_id = $1
            AND fa.is_active
            AND fa.role = 'subject_faculty'
          ORDER BY c.department_id, c.year, c.section, fa.subject_code`,
        [userId]
      ),
    ]);

    const byClass = new Map<string, MyClass>();
    // Class-teacher classes first (no subjectCodes).
    for (const row of teacherRes.rows) {
      byClass.set(row.id, rowToClass(row));
    }
    // Then fold in subject assignments, attaching subjectCodes.
    for (const row of subjectRes.rows) {
      const base = rowToClass(row);
      const existing = byClass.get(row.id);
      if (existing) {
        if (base.subjectCodes) {
          existing.subjectCodes = [
            ...(existing.subjectCodes || []),
            ...base.subjectCodes,
          ];
        }
      } else {
        byClass.set(row.id, base);
      }
    }
    return ok(Array.from(byClass.values()));
  } catch {
    return fail("INTERNAL_ERROR", "Internal server error", 500);
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["faculty"] }),
  { keyPrefix: "my_classes", maxRequests: 30, windowMs: 60_000 }
);
