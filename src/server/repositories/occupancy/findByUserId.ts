import { query } from "@/lib/postgres";

export interface OccupancyState {
  user_id: string;
  current_status: "IN" | "OUT";
  last_gate_id: string | null;
  last_updated: string;
}

export async function findOccupancyByUserId(userId: string): Promise<OccupancyState | null> {
  const { rows } = await query<OccupancyState>(
    `SELECT user_id, current_status, last_gate_id, last_updated
       FROM campus_occupancy
      WHERE user_id = $1
      LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}
