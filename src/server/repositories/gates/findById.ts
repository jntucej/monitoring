import { query } from "@/lib/postgres";

export interface GateRow {
  id: string;
  gate_code: string;
  name: string;
  location: string;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
  allowed_radius_meters: number | null;
}

export async function findGateById(id: string): Promise<GateRow | null> {
  const { rows } = await query<GateRow>(
    `SELECT id, gate_code, name, location, is_active,
            latitude, longitude, allowed_radius_meters
       FROM gates
      WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}
