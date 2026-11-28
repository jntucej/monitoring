/**
 * Resolve the identity attributes a scanned person needs for rule-based
 * lockdown scoping: persona, hostel_block, department, class_section.
 *
 * Only called when at least one ACTIVE *scoped* rule (role/persona/dept/
 * hostel_block/class_section/user) exists, so the common no-lockdown and
 * campus/gate-only paths pay nothing.
 */
import { query } from "@/lib/postgres";

export interface LockdownSubjectAttrs {
  persona: "hosteller" | "day_scholar" | null;
  hostelBlock: string | null;
  departmentCode: string | null;
  classId: string | null;
}

export async function resolveLockdownSubjectAttrs(
  userId: string,
  /** Effective entry type from the scan (IN: chosen; OUT: stored). */
  entryType?: "hosteller" | "day_scholar" | null,
): Promise<LockdownSubjectAttrs> {
  // Student side: persona + hostel_block + class (year/section).
  const student = await query<{
    current_entry_type: string | null;
    student_type: string | null;
    hostel_block: string | null;
    year: number | null;
    section: string | null;
  }>(
    `SELECT sd.current_entry_type, sd.student_type, sd.hostel_block, sd.year, sd.section
       FROM public.student_details sd
      WHERE sd.user_id = $1 LIMIT 1`,
    [userId],
  );
  const s = student.rows[0] ?? null;

  // Persona: prefer the scan's resolved entry type, else the stored one.
  let persona: "hosteller" | "day_scholar" | null = null;
  if (entryType === "hosteller" || entryType === "day_scholar") {
    persona = entryType;
  } else if (s?.current_entry_type === "hosteller" || s?.current_entry_type === "day_scholar") {
    persona = s.current_entry_type;
  } else if (s?.student_type === "HM" || s?.student_type === "HF") {
    persona = "hosteller";
  } else if (s?.student_type === "DM" || s?.student_type === "DF") {
    persona = "day_scholar";
  }

  const hostelBlock = s?.hostel_block ?? null;

  // Class section composite key: "year-section" (e.g. "3-B") — matches how a
  // Principal would target a class bunch.
  const classId =
    s && (s.year != null || s.section)
      ? [s.year ?? "", s.section ?? ""].filter(Boolean).join("-")
      : null;

  // Staff side: department code.
  const emp = await query<{ department_id: string | null }>(
    `SELECT ed.department_id
       FROM public.employee_details ed
      WHERE ed.user_id = $1 LIMIT 1`,
    [userId],
  );
  const departmentCode = emp.rows[0]?.department_id ?? null;

  return { persona, hostelBlock, departmentCode, classId };
}
