import { query } from "@/lib/postgres";

export async function findScanById(id: string): Promise<Record<string, unknown> | null> {
  const { rows } = await query<Record<string, unknown>>(
    `SELECT id, user_id, direction, reason, gate_id, gate_name,
            operator_id, operator_name, timestamp, is_manual, is_correction
       FROM movement_logs
      WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}
