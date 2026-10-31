/** Shared helpers for /api/mess routes. */
import { query } from "@/lib/db";

/**
 * Resolve the calling user's student details.
 * Mess eligibility is driven by the LIVE entry type
 * (student_details.current_entry_type) when set: 'day_scholar' → not
 * eligible, 'hosteller' → eligible. It falls back to the legacy
 * student_type IN ('HM','HF') OR hostel_block IS NOT NULL only when
 * current_entry_type is null (never transitioned at the gate yet).
 */
export async function getMyStudentDetails(userId: string) {
  const res = await query(
    `SELECT u.unique_id AS roll,
            u.name,
            sd.student_type,
            sd.hostel_block,
            sd.current_entry_type
       FROM users u
       LEFT JOIN student_details sd ON sd.user_id::text = u.id::text
      WHERE u.id::text = $1`,
    [userId]
  );
  const row: any = res.rows[0];
  if (!row) return null;
  return {
    roll: row.roll ?? "",
    name: row.name ?? "",
    studentType: row.student_type ?? null,
    hostelBlock: row.hostel_block ?? null,
    currentEntryType: row.current_entry_type ?? null,
  };
}

/**
 * Mess eligibility. Prefer the live current_entry_type when the student has
 * already transitioned at the gate; only fall back to the legacy
 * student_type / hostel_block check for never-scanned students. A
 * day_scholar (or any entry type that is not 'hosteller') is not eligible.
 */
export function isMessEligible(
  studentType: string | null,
  hostelBlock: string | null | undefined,
  currentEntryType?: string | null
): boolean {
  if (currentEntryType === "day_scholar") return false;
  if (currentEntryType === "hosteller") return true;
  // Live type unknown (never transitioned) → legacy fallback.
  return studentType === "HM" || studentType === "HF" || !!hostelBlock;
}

/** Find next active mess day (meal_date >= today). */
export async function getNextActiveDay() {
  const res = await query(
    `SELECT id, meal_date, meal_type, day_type,
            window_opens_at, window_closes_at,
            tokens_locked_at, tokens_revoked_at, is_active
       FROM mess_days
      WHERE is_active = TRUE
        AND meal_date >= CURRENT_DATE
      ORDER BY meal_date ASC, window_opens_at ASC
      LIMIT 1`
  );
  return (res.rows[0] as any) ?? null;
}

/** Find a mess day by id (accepts uuid string). */
export async function getDayById(dayId: string) {
  const res = await query(
    `SELECT id, meal_date, meal_type, day_type,
            window_opens_at, window_closes_at,
            tokens_locked_at, tokens_revoked_at, is_active
       FROM mess_days WHERE id::text = $1`,
    [dayId]
  );
  return (res.rows[0] as any) ?? null;
}
