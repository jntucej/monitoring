import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { ClassRow, ClassOverview } from "@/contracts/classes";

// Contract: src/contracts/classes.ts  (faculty scope)
//
// GET /api/faculty/my-class/[id]
// Caller is a faculty user (or admin/sysadmin). They may only see a class they
// are personally assigned to: either as its class_teacher, or via an active
// faculty_assignments row. Otherwise 403 FORBIDDEN.
//
// Returns the contract's ClassOverview:
//   { classRow, students: roster, todayPresent, todayAbsent, totalStudents }
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
}

interface RosterRow {
  id: string;
  name: string | null;
  roll: string;
  year: number | null;
  section: string | null;
}

// Map a DB row to the contract's ClassRow (camelCase).
function toClassRow(row: ClassDbRow): ClassRow {
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
  };
}

// Extract the class id from the path segment [...]/my-class/<id>.
function getClassIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = segments.lastIndexOf("my-class");
  const raw = idx > 0 ? segments[idx + 1] : segments[segments.length - 1];
  return raw ? decodeURIComponent(raw) : "";
}

// Today's date in YYYY-MM-DD (local), matching how attendance_records.date
// is written elsewhere in the app.
function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function handleGet(req: NextRequest, { auth }: { auth: { userId: string } }) {
  const userId = auth.userId;
  const classId = getClassIdFromPath(req);
  if (!classId) {
    return fail("INVALID_CLASS_ID", "Class id is required", 400);
  }

  try {
    // 1) Load the class.
    const classRes = await query<ClassDbRow>(
      `SELECT * FROM public.classes WHERE id = $1::uuid LIMIT 1`,
      [classId]
    );
    const classRowRaw = classRes.rows[0];
    if (!classRowRaw) {
      return fail("NOT_FOUND", "Class not found", 404);
    }

    // 2) Scope check: caller must be the class_teacher OR have an active
    // faculty_assignments row for this class. Admin/sysadmin always allowed.
    const role = req.headers.get("x-user-role") || "";
    let authorized = role === "admin" || role === "sysadmin";
    if (!authorized) {
      const scopeRes = await query<{ ok: boolean }>(
        `SELECT
           CASE
             WHEN c.class_teacher_id = $1 THEN TRUE
             WHEN EXISTS (
                   SELECT 1 FROM public.faculty_assignments fa
                    WHERE fa.class_id = $2
                      AND fa.faculty_id = $1
                      AND fa.is_active
                 ) THEN TRUE
             ELSE FALSE
           END AS ok
           FROM public.classes c
          WHERE c.id = $2::uuid`,
        [userId, classId]
      );
      authorized = Boolean(scopeRes.rows[0]?.ok);
    }
    if (!authorized) {
      return fail("FORBIDDEN", "Not assigned to this class", 403);
    }

    // 3) Roster: students in this class by (dept, year, section).
    const rosterRes = await query<RosterRow>(
      `SELECT u.id,
              u.name,
              sd.roll,
              sd.year,
              sd.section
         FROM public.users u
         JOIN public.student_details sd ON sd.user_id = u.id
        WHERE u.role = 'student'
          AND u.department_id = $1
          AND sd.year = $2
          AND sd.section = $3
        ORDER BY sd.roll`,
      [classRowRaw.department_id, classRowRaw.year, classRowRaw.section]
    );
    const students = rosterRes.rows.map((r) => ({
      id: r.id,
      name: r.name ?? "",
      roll: r.roll,
      year: r.year,
      section: r.section,
    }));
    const totalStudents = students.length;

    // 4) Today's attendance for this class's students. attendance_records has
    // no class_id; we count today's records for the class's student person_ids.
    // If the table is missing / the query fails, fall back to 0/0 without error.
    let todayPresent = 0;
    let todayAbsent = 0;
    if (totalStudents > 0) {
      const ids = rosterRes.rows.map((r) => r.id);
      const today = todayYmd();
      try {
        const attRes = await query<{ status: string | null }>(
          `SELECT status
             FROM public.attendance_records
            WHERE person_id = ANY($1::uuid[])
              AND date = $2::date`,
          [ids, today]
        );
        const PRESENT = new Set(["PRESENT", "IN", "present"]);
        const ABSENT = new Set(["ABSENT", "OUT", "absent"]);
        for (const r of attRes.rows) {
          const s = r.status;
          if (s == null) continue;
          const up = s.toUpperCase();
          if (PRESENT.has(up) || s === "present") todayPresent++;
          else if (ABSENT.has(up) || s === "absent") todayAbsent++;
        }
      } catch {
        // attendance_records may not exist in every environment — degrade to 0/0.
        todayPresent = 0;
        todayAbsent = 0;
      }
    }

    // ── This-week attendance (last 7 days) ──
    let weekPresent = 0;
    let weekAbsent = 0;
    if (totalStudents > 0) {
      try {
        const weekRes = await query<{ status: string | null }>(
          `SELECT status
             FROM public.attendance_records
            WHERE person_id = ANY($1::uuid[])
              AND date >= ($2::date - interval '6 days')
              AND date <= $2::date`,
          [rosterRes.rows.map((r) => r.id), todayYmd()]
        );
        for (const r of weekRes.rows) {
          const s = r.status;
          if (s == null) continue;
          const up = s.toUpperCase();
          if (["PRESENT", "IN", "present"].includes(up) || s === "present") weekPresent++;
          else if (["ABSENT", "OUT", "absent"].includes(up) || s === "absent") weekAbsent++;
        }
      } catch {
        weekPresent = 0;
        weekAbsent = 0;
      }
    }

    // ── Disputes raised this week (attendance_disputes) ──
    let disputesThisWeek: Array<{ studentId: string; studentName: string; date: string; reason: string; status: string }> = [];
    if (totalStudents > 0) {
      try {
        const dispRes = await query<{
          student_id: string; student_name: string; date: string; reason: string; status: string;
        }>(
          `SELECT ad.person_id::text AS student_id,
                  u.name AS student_name,
                  to_char(ad.date, 'YYYY-MM-DD') AS date,
                  ad.reason,
                  ad.status
             FROM public.attendance_disputes ad
             JOIN public.users u ON u.id = ad.person_id
            WHERE ad.person_id = ANY($1::uuid[])
              AND ad.date >= ($2::date - interval '6 days')
              AND ad.status NOT IN ('RESOLVED','DISMISSED')
            ORDER BY ad.date DESC
            LIMIT 5`,
          [rosterRes.rows.map((r) => r.id), todayYmd()]
        );
        disputesThisWeek = dispRes.rows.map((r) => ({
          studentId: r.student_id,
          studentName: r.student_name ?? "Unknown",
          date: r.date,
          reason: r.reason,
          status: r.status,
        }));
      } catch {
        disputesThisWeek = [];
      }
    }

    const overview: ClassOverview = {
      classRow: toClassRow(classRowRaw),
      students,
      todayPresent,
      todayAbsent,
      totalStudents,
      weekPresent,
      weekAbsent,
      disputesThisWeek,
    };
    return ok(overview);
  } catch {
    return fail("INTERNAL_ERROR", "Internal server error", 500);
  }
}

export const GET = withApiChain(handleGet, {
  route: "/api/faculty/my-class/[id]",
  auth: "user",
  requiredRole: ["faculty"],
  rateLimit: { keyPrefix: "my_class", maxRequests: 30, windowMs: 60_000 },
});
