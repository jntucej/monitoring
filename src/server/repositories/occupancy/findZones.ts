import { query } from "@/lib/postgres";

export interface ZoneRow {
  id: string;
  name: string;
  type: string;
  capacity: number;
}

export interface InsideByRole {
  role: string;
  count: number;
}

export async function findZones(): Promise<ZoneRow[]> {
  const { rows } = await query<ZoneRow>(
    `SELECT id, name, type, capacity FROM zones ORDER BY name ASC`,
  );
  return rows;
}

export async function countInsideByRole(): Promise<InsideByRole[]> {
  const { rows } = await query<InsideByRole>(
    `SELECT u.role, count(*)::int AS count
       FROM campus_occupancy co
       JOIN users u ON u.id = co.user_id
      WHERE co.current_status = "IN"
      GROUP BY u.role`,
  );
  return rows;
}
