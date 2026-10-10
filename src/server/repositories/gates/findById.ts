import { query } from "@/lib/postgres";

export interface GateRow {
  id: string;
  gate_code: string;
  name: string;
  location: string;
  is_active: boolean;
}

export async function findGateById(id: string): Promise<GateRow | null> {
  const { rows } = await query<GateRow>(
    `SELECT id, gate_code, name, location, is_active
       FROM gates
      WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}
