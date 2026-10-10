import { query } from "@/lib/postgres";

export interface DepartmentRow {
  id: string;
  code: string;
  name: string;
}

export async function findAll(): Promise<DepartmentRow[]> {
  const { rows } = await query<DepartmentRow>(
    `SELECT id, code, name
       FROM departments
      ORDER BY name ASC`,
  );
  return rows;
}
