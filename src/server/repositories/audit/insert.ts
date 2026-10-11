import { query } from "@/lib/postgres";

export interface AuditEntry {
  action: string;
  userId: string | null;
  userName?: string | null;
  role?: string | null;
  details?: Record<string, unknown>;
}

export async function insert(entry: AuditEntry): Promise<void> {
  await query(
    `INSERT INTO audit_logs (action, user_id, user_name, user_role, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [entry.action, entry.userId, entry.userName ?? null, entry.role ?? null, JSON.stringify(entry.details ?? {})],
  );
}
