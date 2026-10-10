import { query } from "@/lib/postgres";

export interface GateListRow {
  id: string;
  gateCode: string;
  name: string;
  location: string;
  type: string;
  isActive: boolean;
}

export async function findAll(): Promise<GateListRow[]> {
  const { rows } = await query<GateListRow>(
    `SELECT id,
            gate_code AS "gateCode",
            name,
            location,
            type,
            is_active AS "isActive"
       FROM gates
      ORDER BY name ASC`,
  );
  return rows;
}
