// src/app/api/faculty/attendance/roster/[studentId]/route.ts
//
// PATCH /api/faculty/attendance/roster/[studentId]
//
// Mark a single student present/absent in a class's attendance register for
// today. This is the per-student mutation that backs the Faculty
// AttendanceStatusBoard (Board 1). It intentionally mirrors the authoritative
// bulk path at /api/classes/[id]/attendance:
//   - writes into public.attendance_records (person_id, date, status, dedupe_key)
//   - one record per person per day, upserted on (dedupe_key)
//   - dedupe_key = `${personId}-${YYYY-MM-DD}`
//
// Body: { field: "present" | "absent", value?: "1", reason?: string, classId: string }
//   - field drives status ("present" | "absent"); reason is stored on the
//     record's meta for audit (does not block the write).
//   - classId is required: attendance is class-scoped (via student_details),
//     so the route verifies the student belongs to that class before writing.
//
// Roles: faculty, hod, admin, sysadmin (same as the bulk attendance writer).
// CSRF: required (same as the bulk path).

import { NextRequest } from "next/server";
import { assertCsrf } from "@/lib/csrf";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

const FACULTY_ROLES = ["faculty", "hod", "admin", "sysadmin"];

function getStudentId(req: NextRequest): string {
  // .../roster/[studentId]  -> last segment is the student id
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1] ?? "");
}

async function handlePatch(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  if (!FACULTY_ROLES.includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }

  const studentId = getStudentId(req);
  if (!studentId) return fail("VALIDATION_ERROR", "studentId required", 400);

  const body = (await req.json().catch(() => ({}))) as {
    field?: "present" | "absent";
    value?: string;
    reason?: string;
    classId?: string;
  };

  const field = body.field;
  if (field !== "present" && field !== "absent") {
    return fail("VALIDATION_ERROR", 'field must be "present" or "absent"', 400);
  }
  const classId = body.classId;
  if (!classId) return fail("VALIDATION_ERROR", "classId required", 400);

  // The board keys off users.id (person_id). Confirm the id resolves to a
  // real user AND that they are rostered into the target class (via
  // student_details), so a forged id or wrong-class mark is rejected.
  const rosterCheck = await query<{ id: string }>(
    `SELECT sd.user_id::text AS id
       FROM public.student_details sd
       JOIN public.classes c
         ON c.department_id = sd.department_id
        AND c.year = sd.year
        AND c.section = sd.section
      WHERE sd.user_id = $1::uuid AND c.id = $2::uuid
      LIMIT 1`,
    [studentId, classId],
  );
  if (rosterCheck.rows.length === 0) {
    return fail("NOT_FOUND", "Student is not rostered into this class", 404);
  }

  // Same upsert semantics as the bulk path: one record per person per day,
  // keyed by dedupe_key = `${personId}-${today}`. `reason` is kept in meta.
  const today = new Date().toISOString().slice(0, 10);
  const dedupeKey = `${studentId}-${today}`;
  const status = field; // lowercase, matching the bulk writer's status domain

  await query(
    `INSERT INTO public.attendance_records (person_id, date, status, dedupe_key, meta)
     VALUES ($1::uuid, CURRENT_DATE, $2, $3, $4::jsonb)
     ON CONFLICT (dedupe_key) DO UPDATE
       SET status = EXCLUDED.status,
           meta = attendance_records.meta || EXCLUDED.meta,
           updated_at = NOW()`,
    [studentId, status, dedupeKey, JSON.stringify(body.reason ? { reason: body.reason } : {})],
  );

  return ok({ studentId, classId, status, date: today });
}

export const PATCH = withAuthorization(handlePatch);
