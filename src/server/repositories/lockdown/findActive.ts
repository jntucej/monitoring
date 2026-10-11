import { query } from "@/lib/postgres";
import type { ActiveLockdown } from "@/server/policy/lockdown";

interface LockdownRow {
  id: string;
  data: { scopes?: string[]; message?: string | null; lifted_at?: string | null };
}

export async function findActiveLockdown(): Promise<ActiveLockdown | null> {
  const { rows } = await query<LockdownRow>(
    `SELECT id, data
       FROM lockdown_broadcasts
      WHERE (data->>'lifted_at') IS NULL
      ORDER BY created_at DESC
      LIMIT 1`,
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    scopes: row.data.scopes ?? [],
    message: row.data.message ?? null,
  };
}
