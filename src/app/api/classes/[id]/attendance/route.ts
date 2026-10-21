// src/app/api/classes/[id]/attendance/route.ts
// GET  /api/classes/[id]/attendance — today's attendance records for a class.
// POST /api/classes/[id]/attendance — bulk-record attendance for the class roster.

import { NextRequest } from "next/server";
import { assertCsrf } from "@/lib/csrf";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

const FACULTY_ROLES = ["faculty", "hod", "admin", "sysadmin"];

function getClassId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function handleGet(req: NextRequest): Promise<Response> {
  const classId = getClassId(req);
  if (!classId) return fail("VALIDATION_ERROR", "classId required", 400);

  const { rows } = await query(
    `SELECT ar.id,
            ar.person_id  AS person_id,
            ar.date,
            ar.time_in    AS time_in,
            ar.time_out   AS time_out,
            ar.status,
            u.name,
            u.unique_id   AS roll
       FROM public.attendance_records ar
       JOIN public.users u ON u.id = ar.person_id
      WHERE ar.date = CURRENT_DATE
        AND ar.person_id IN (
          SELECT sd.user_id
            FROM public.student_details sd
            JOIN public.classes c ON c.department_id = sd.department_id
                                  AND c.year = sd.year
                                  AND c.section = sd.section
           WHERE c.id = $1
        )
      ORDER BY u.name`,
    [classId],
  );

  return ok({ classId, records: rows });
}

async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  if (!FACULTY_ROLES.includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }

  const classId = getClassId(req);
  if (!classId) return fail("VALIDATION_ERROR", "classId required", 400);

  const { records } = (await req.json().catch(() => ({}))) as {
    records?: Array<{ personId: string; status: "present" | "absent" | "late" }>;
  };
  if (!records?.length) return fail("VALIDATION_ERROR", "records required", 400);

  // Bulk upsert: one record per person per day, keyed by the dedupe column.
  const nowIso = new Date().toISOString();
  const values = records
    .map((r, i) => `($${i + 1}, CURRENT_DATE, $${i + 2}, $${i + 3})`)
    .join(", ");
  const params: unknown[] = [];
  for (const r of records) {
    if (!r.personId || !["present", "absent", "late"].includes(r.status)) {
      return fail("VALIDATION_ERROR", "each record needs personId and a valid status", 400);
    }
    params.push(r.personId, r.status, `${r.personId}-${nowIso.slice(0, 10)}`);
  }

  const { rowCount } = await query(
    `INSERT INTO public.attendance_records (person_id, date, status, dedupe_key)
     VALUES ${values}
     ON CONFLICT (dedupe_key) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()`,
    params,
  );

  return ok({ classId, inserted: rowCount ?? 0 });
}

export const GET = withAuthorization(handleGet);
export const POST = withAuthorization(handlePost);
