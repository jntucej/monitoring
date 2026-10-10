import { query } from "@/lib/postgres";

export interface ScanUserRow {
  id: string;
  unique_id: string;
  name: string;
  role: string;
  status: string;
  photo_url: string | null;
}

export async function findByUniqueId(uniqueId: string): Promise<ScanUserRow | null> {
  const { rows } = await query<ScanUserRow>(
    `SELECT id, unique_id, name, role, status, photo_url
       FROM users
      WHERE UPPER(unique_id) = UPPER($1)
      LIMIT 1`,
    [uniqueId],
  );
  return rows[0] ?? null;
}
