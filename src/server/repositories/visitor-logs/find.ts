import { query } from "@/lib/postgres";

export interface VisitorLogRow {
  person_id: string; // Updated from id (per original code usage)
  host_person_id: string | null;
  purpose: string | null;
  check_in_at: string;
  check_out_at: string | null;
}

export async function find(from: string, to: string): Promise<VisitorLogRow[]> {
  const { rows } = await query<VisitorLogRow>(
    `SELECT person_id, host_person_id, purpose, check_in_at, check_out_at
       FROM visitor_logs
      WHERE check_in_at >= $1 AND check_in_at <= $2`,
    [`${from}T00:00:00.000Z`, `${to}T23:59:59.999Z`],
  );
  return rows;
}
