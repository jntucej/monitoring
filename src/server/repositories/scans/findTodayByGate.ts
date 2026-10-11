import { query } from "@/lib/postgres";

export interface MovementRow {
  id: string;
  user_id: string;
  direction: "IN" | "OUT";
  reason: string | null;
  gate_id: string | null;
  gate_name: string;
  timestamp: string;
}

export async function findTodayByGate(gateId?: string): Promise<MovementRow[]> {
  const sql = gateId
    ? `SELECT id, user_id, direction, reason, gate_id, gate_name, timestamp
       FROM movement_logs
       WHERE (timestamp AT TIME ZONE 'Asia/Kolkata')::date =
             (now() AT TIME ZONE 'Asia/Kolkata')::date
         AND gate_id = $1
       ORDER BY timestamp ASC`
    : `SELECT id, user_id, direction, reason, gate_id, gate_name, timestamp
       FROM movement_logs
       WHERE (timestamp AT TIME ZONE 'Asia/Kolkata')::date =
             (now() AT TIME ZONE 'Asia/Kolkata')::date
       ORDER BY timestamp ASC`;

  const params = gateId ? [gateId] : [];
  const { rows } = await query<MovementRow>(sql, params);
  return rows;
}
