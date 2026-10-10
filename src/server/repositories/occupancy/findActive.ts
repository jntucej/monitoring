import { query } from "@/lib/postgres";

export interface OccupancyRow {
  user_id: string;
  current_status: "IN" | "OUT";
  last_gate_id: string | null;
  last_updated: string;
}

export async function findActive(): Promise<OccupancyRow[]> {
  const { rows } = await query<OccupancyRow>(
    `SELECT user_id, current_status, last_gate_id, last_updated
     FROM campus_occupancy`,
  );
  return rows;
}
