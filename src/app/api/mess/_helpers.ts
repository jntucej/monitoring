/** Shared helpers for /api/mess routes. */
import { query } from "@/lib/db";

/**
 * Resolve the calling user's student details.
 * Mess eligibility: student_type IN ('HM','HF') OR hostel_block IS NOT NULL
 * (student_details.student_type is currently unpopulated, so the hostel_block
 * check acts as the fallback).
 */
export async function getMyStudentDetails(userId: string) {
  const res = await query(
    `SELECT u.unique_id AS roll,
            u.name,
            sd.student_type,
            sd.hostel_block
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
  };
}

export function isMessEligible(studentType: string | null, hostelBlock: string | null | undefined): boolean {
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
