import { query } from "@/lib/postgres";
import { parseRollNumber } from "@/lib/rollNumber";

export interface ResolvedAcademicState {
  source: "history" | "roll_fallback";
  academic_year_code: string;
  program_code: string;
  branch_code: string;
  branch_short_name: string;
  entry_mode_code: string;
  regulation_code: string | null;
  year_of_study: number;
  section: string | null;
  academic_status: string;
}

export async function resolveStudentAcademicState(
  studentId: string,
  atTimestamp?: Date | string,
): Promise<ResolvedAcademicState | null> {
  const ts = atTimestamp ? new Date(atTimestamp).toISOString() : new Date().toISOString();

  const { rows } = await query<{
    academic_year_code: string;
    program_code: string;
    branch_code: string;
    branch_short_name: string;
    entry_mode_code: string;
    regulation_code: string | null;
    year_of_study: number;
    section: string | null;
    academic_status: string;
  }>(
    `SELECT sah.academic_year_code, sah.program_code, sah.branch_code,
            ab.short_name AS branch_short_name, sah.entry_mode_code,
            sah.regulation_code, sah.year_of_study, sah.section, sah.academic_status
       FROM public.student_academic_history sah
       JOIN public.academic_branches ab ON ab.code = sah.branch_code
      WHERE sah.student_id = $1::uuid
        AND sah.effective_from <= $2::timestamptz
        AND (sah.effective_to IS NULL OR sah.effective_to > $2::timestamptz)
      ORDER BY sah.effective_from DESC
      LIMIT 1`,
    [studentId, ts],
  );

  if (rows[0]) {
    return { source: "history", ...rows[0] };
  }

  // Fallback to rollNumber.ts only when student_academic_history has not been backfilled
  const { rows: uRows } = await query<{ unique_id: string | null }>(
    `SELECT unique_id FROM public.users WHERE id = $1::uuid LIMIT 1`,
    [studentId],
  );
  const roll = uRows[0]?.unique_id;
  if (!roll) return null;

  const decoded = parseRollNumber(roll);
  if (!decoded) return null;

  console.warn(`[academic/resolver] roll_fallback used for student=${studentId} roll=${roll}`);
  const currentYear = new Date().getFullYear();
  const rawYear = Math.max(1, currentYear - decoded.admissionYear + (decoded.entryModeCode === "5A" ? 2 : 1));

  return {
    source: "roll_fallback",
    academic_year_code: "2026-27",
    program_code: decoded.entryModeCode === "1D" ? "MTECH" : "BTECH",
    branch_code: decoded.departmentCode,
    branch_short_name: decoded.department,
    entry_mode_code: decoded.entryModeCode,
    regulation_code: "R22",
    year_of_study: Math.min(4, rawYear),
    section: null,
    academic_status: "active",
  };
}

export async function recordAcademicTransition(input: {
  studentId: string;
  academicYearCode: string;
  programCode: string;
  branchCode: string;
  entryModeCode: string;
  regulationCode?: string | null;
  yearOfStudy: number;
  section?: string | null;
  academicStatus: "active" | "detained" | "year_back" | "branch_change" | "readmitted" | "graduated";
  eventReason: string;
  createdBy: string;
}) {
  await query(
    `UPDATE public.student_academic_history
        SET effective_to = NOW()
      WHERE student_id = $1::uuid AND effective_to IS NULL`,
    [input.studentId],
  );

  const { rows } = await query(
    `INSERT INTO public.student_academic_history
       (student_id, academic_year_code, program_code, branch_code, entry_mode_code,
        regulation_code, year_of_study, section, academic_status, event_reason, created_by)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::uuid)
     RETURNING *`,
    [
      input.studentId,
      input.academicYearCode,
      input.programCode,
      input.branchCode,
      input.entryModeCode,
      input.regulationCode ?? "R22",
      input.yearOfStudy,
      input.section ?? null,
      input.academicStatus,
      input.eventReason,
      input.createdBy,
    ],
  );
  return rows[0];
}

export async function resolveEffectiveSchedule(
  targetType: "gate" | "class" | "campus",
  targetId: string,
  dateStr: string,
) {
  const { rows: exRows } = await query(
    `SELECT override_mode, open_time, close_time, reason
       FROM public.schedule_exceptions
      WHERE target_type = $1 AND target_id = $2 AND exception_date = $3::date
      LIMIT 1`,
    [targetType, targetId, dateStr],
  );
  if (exRows[0]) {
    return { source: "exception" as const, ...exRows[0] };
  }
  return { source: "default" as const, override_mode: "normal", open_time: "06:00", close_time: "22:00", reason: null };
}

let branchCache: { at: number; map: Record<string, string> } | null = null;

export async function getActiveBranchMap(): Promise<Record<string, string>> {
  if (branchCache && Date.now() - branchCache.at < 60_000) {
    return branchCache.map;
  }
  const { rows } = await query<{ code: string; short_name: string }>(
    `SELECT code, short_name FROM public.academic_branches WHERE is_active = true`,
  );
  const map: Record<string, string> = {};
  for (const r of rows) map[r.code] = r.short_name;
  branchCache = { at: Date.now(), map };
  return map;
}
