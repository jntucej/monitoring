import { query } from "@/lib/postgres";

export interface LastMovementRow {
  user_id: string;
  direction: "IN" | "OUT";
  reason: string | null;
  timestamp: string;
}

/**
 * Reads the most recent movement-log scan for a user (any direction).
 *
 * Used by the scan service to apply OUT-scan duration caps: the OUT window
 * starts from the last IN scan, so a hosteller who has been out longer than
 * the reason's cap (daily_outing: 1h, day_pass: 12h) is rejected / warned.
 *
 * Returns null when the user has no movement history.
 */
export async function findLastMovementByUserId(userId: string): Promise<LastMovementRow | null> {
  const { rows } = await query<LastMovementRow>(
    `SELECT user_id, direction, reason, timestamp
       FROM movement_logs
      WHERE user_id = $1
      ORDER BY timestamp DESC
      LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}
