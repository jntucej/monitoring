import { query } from "@/lib/postgres";
import { publishAlert } from "@/lib/alerting";
import { addAudit } from "@/lib/db";

export interface TripContext {
  ip?: string;
  userAgent?: string;
  attemptedIdentifier?: string;
  details?: Record<string, unknown>;
}

export const HONEYTOKEN_IDENTIFIERS = [
  "admin-root-sys",
  "sysadmin.canary",
  "superadmin_backup",
];

export const CANARY_AUDIT_ENTRY_HASH = "canary-audit-tripwire-hash-deadbeef0001";

/**
 * Trigger an immediate high-severity security alert when any deception asset is touched.
 */
export async function triggerDeceptionAlert(
  tokenKind: "canary_env" | "honeytoken_user" | "canary_audit" | "fake_backup_cred",
  context: TripContext
) {
  const message = `🚨 HIGH FIDELITY DECEPTION BREACH: ${tokenKind.toUpperCase()} triggered by IP ${context.ip || "unknown"}. Context: ${JSON.stringify(context.details || {})}`;
  console.error(`[DECEPTION ALERT] ${message}`);

  // 1. Dispatch active system alert
  try {
    await publishAlert({
      rule_id: `deception-${tokenKind}`,
      rule_name: `Tripwire Breach: ${tokenKind}`,
      metric: "deception_breach",
      current_value: 1,
      threshold: 0,
      severity: "critical",
      message,
    });
  } catch (err) {
    console.error("[deception] Failed to publish alert:", err);
  }

  // 2. Record critical security audit log entry
  try {
    await addAudit({
      userId: "00000000-0000-0000-0000-000000000000",
      action: "SECURITY_BREACH_DETECTED",
      details: {
        tokenKind,
        ...context,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[deception] Failed to write security audit log:", err);
  }
}

/**
 * Check if a login identifier matches our honeytoken sysadmin accounts.
 */
export function isHoneytokenIdentifier(identifier: string): boolean {
  if (!identifier) return false;
  const clean = identifier.trim().toLowerCase();
  return HONEYTOKEN_IDENTIFIERS.some((h) => h.toLowerCase() === clean);
}

/**
 * Verify canary audit log integrity.
 * If the canary row is missing or its entry_hash was tampered with, fire the alert.
 */
export async function verifyCanaryAuditRow(): Promise<boolean> {
  try {
    const { rows } = await query<{ count: string }>(
      `SELECT count(*) FROM public.audit_logs WHERE action = 'CANARY_TRIPWIRE_SENTINEL' AND entry_hash = $1`,
      [CANARY_AUDIT_ENTRY_HASH]
    );
    const count = parseInt(rows[0]?.count ?? "0", 10);
    if (count === 0) {
      await triggerDeceptionAlert("canary_audit", {
        details: { reason: "Canary audit row was deleted or modified" },
      });
      return false;
    }
    return true;
  } catch (err) {
    console.error("[deception] verifyCanaryAuditRow check failed:", err);
    return false;
  }
}
