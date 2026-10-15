import { query } from "@/lib/postgres";
import { getSupabaseServiceClient } from "@/lib/dbClient";

/**
 * A user's entry-type selection row (subset of student_details).
 * student_details is keyed by user_id (UUID primary key, see
 * database/schema.sql section 1.3).
 */
export interface StudentDetailsEntryTypeRow {
  user_id: string;
  current_entry_type: string | null;
  type_chosen_at: string | null;
  type_chosen_at_gate: string | null;
}

/**
 * Read the stored entry-type selection for a user (student_details keyed by
 * user_id). Returns null when the user has no student_details row.
 */
export async function findStudentDetailsByUserId(
  userId: string,
): Promise<StudentDetailsEntryTypeRow | null> {
  const { rows } = await query<StudentDetailsEntryTypeRow>(
    `SELECT user_id, current_entry_type, type_chosen_at, type_chosen_at_gate
       FROM student_details
      WHERE user_id = $1
      LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}

export interface UpdateEntryTypeInput {
  userId: string;
  entryType: "hosteller" | "day_scholar";
  gateId: string;
  chosenAt: string;
}

/**
 * Persist a student's entry-type selection on student_details.
 *
 * Non-fatal: any error is logged and swallowed so that a failed type update
 * can never roll back an already-recorded scan. Callers can await this
 * unconditionally.
 */
export async function updateEntryType(input: UpdateEntryTypeInput): Promise<void> {
  try {
    const client = getSupabaseServiceClient();
    const { error } = await client
      .from("student_details")
      .update({
        current_entry_type: input.entryType,
        type_chosen_at: input.chosenAt,
        type_chosen_at_gate: input.gateId,
      })
      .eq("user_id", input.userId);
    if (error) {
      throw error;
    }
  } catch (e) {
    // Non-fatal by contract: a failed type update must not affect the recorded
    // scan, so log and continue.
    console.error("[studentDetails] updateEntryType failed (non-fatal):", e);
  }
}
