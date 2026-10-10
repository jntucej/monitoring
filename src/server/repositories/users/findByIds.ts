import { query } from "@/lib/postgres";
import type { Role } from "@/lib/types";

export interface UserLookupRow {
  id: string;
  name: string;
  unique_id: string;
  role: Role;
  student_type: string | null;
}

export async function findByIds(ids: string[]): Promise<UserLookupRow[]> {
  if (ids.length === 0) return [];
  const { rows } = await query<UserLookupRow>(
    `SELECT u.id,
            u.name,
            u.unique_id,
            u.role,
            sd.student_type
       FROM users u
       LEFT JOIN student_details sd ON sd.user_id = u.id
      WHERE u.id = ANY($1::uuid[])`,
    [ids],
  );
  return rows;
}
