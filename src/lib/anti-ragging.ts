import { createHmac, randomInt } from "crypto";
import { query } from "@/lib/postgres";

export function generateCaseNumber(): string {
  const y = new Date().getFullYear();
  return `ARC-${y}-${randomInt(100_000, 999_999 + 1)}`;
}

/**
 * HMAC-SHA256 keyed hash of the reporter's userId.
 *
 * UGC Anti-Ragging Regulations 2009 require the complainant's identity to be
 * kept confidential. A plain SHA-256 of a known userId list is crackable in
 * milliseconds; an HMAC keyed with a server-side secret is not — an attacker
 * who obtains both a case row and the userIds still cannot recover which
 * userId produced which hash without ANTI_RAGGING_HASH_SECRET.
 *
 * The secret MUST be set in .env (generate with: openssl rand -hex 32).
 * It is NOT the same secret as other app secrets — rotation isolates this
 * hashing domain.
 */
export function reporterHash(userId: string): string {
  const secret = process.env.ANTI_RAGGING_HASH_SECRET;
  if (!secret) {
    // Fail loudly: an unkeyed hash defeats the whole point.
    throw new Error(
      "ANTI_RAGGING_HASH_SECRET is not set — refusing to produce an unkeyed reporter hash."
    );
  }
  return createHmac("sha256", secret).update(userId).digest("hex");
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
