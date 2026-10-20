import { createHash } from "crypto";
import { query } from "@/lib/postgres";

export function generateCaseNumber(): string {
  const y = new Date().getFullYear();
  return `ARC-${y}-${Math.floor(Math.random() * 900_000) + 100_000}`;
}

export function reporterHash(userId: string): string {
  return createHash("sha256")
    .update(`${userId}:${process.env.ANTI_RAGGING_SALT ?? "default-salt"}`)
    .digest("hex");
}

export interface RaggingAlertConfig {
  enabled: boolean;
  email_roles: string[];
  extra_emails: string[];
  sms_roles: string[];
}

export async function loadAlertConfig(): Promise<RaggingAlertConfig> {
  const { rows } = await query<{ value: RaggingAlertConfig }>(
    `SELECT value FROM system_settings WHERE id = 'anti_ragging_alert_config' LIMIT 1`,
  );
  return (
    rows[0]?.value ?? {
      enabled: true,
      email_roles: ["principal", "supervisor", "admin"],
      extra_emails: [],
      sms_roles: ["principal"],
    }
  );
}

export async function resolveAlertRecipients(roles: string[]): Promise<string[]> {
  if (!roles.length) return [];
  const { rows } = await query<{ email: string }>(
    `SELECT DISTINCT email FROM users WHERE role = ANY($1::text[]) AND email IS NOT NULL AND status = 'ACTIVE'`,
    [roles],
  );
  return rows.map((r) => r.email);
}
