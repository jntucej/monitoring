import { query } from "@/lib/postgres";
import type {
  ActiveLockdown,
  LockdownRule,
  LockdownScopeType,
  LockdownDirection,
  LockdownStatus,
} from "@/server/policy/lockdown";

interface LockdownRow {
  id: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Coerce a `lockdown_broadcasts.data` JSONB payload into a fully-typed
 * LockdownRule. Legacy rows (CEJ-96 stubs) carry only `scopes`/`message`
 * — those map to a campus-wide BOTH-direction ACTIVE rule so the original
 * global-boolean behavior is preserved.
 */
export function toLockdownRule(row: {
  id: string;
  data: Record<string, unknown>;
  created_at: string;
}): LockdownRule {
  const d = row.data ?? {};
  const scope_type = (d.scope_type as LockdownScopeType | undefined) ?? "campus";
  const rawTargets = Array.isArray(d.target_values)
    ? (d.target_values as string[])
    : Array.isArray(d.scopes)
      ? (d.scopes as string[])
      : [];
  const direction = (d.direction as LockdownDirection | undefined) ?? "BOTH";
  // A PENDING_PRINCIPAL rule is NOT yet enforceable — only ACTIVE blocks.
  // Legacy rows have no `status` field → treat as ACTIVE (original behavior).
  const status = (d.status as LockdownStatus | undefined) ?? "ACTIVE";
  return {
    id: row.id,
    scope_type,
    target_values: rawTargets,
    direction,
    status,
    public_message:
      (d.public_message as string | null) ?? (d.message as string | null) ?? null,
    expires_at: (d.expires_at as string | null) ?? null,
    initiated_by:
      (d.issued_by as string | null) ?? (d.initiated_by as string | null) ?? null,
    approved_by: (d.approved_by as string | null) ?? null,
    lifted_by: (d.lifted_by as string | null) ?? null,
    lift_reason: (d.lift_reason as string | null) ?? null,
    evacuation: d.evacuation === true,
    scopes: rawTargets,
  };
}

/**
 * Returns the single most-recent active lockdown (legacy API). Used by the
 * fast step-1 gate check in recordScan and the old SSE stream. Collapses to
 * {scopes, message} for the legacy ActiveLockdown shape.
 */
export async function findActiveLockdown(): Promise<ActiveLockdown | null> {
  const rules = await findActiveLockdownRules();
  const active = rules
    .filter((r) => r.status === "ACTIVE")
    .sort((a, b) => a.scope_type.localeCompare(b.scope_type));
  // Prefer a campus-wide ACTIVE rule for the legacy global check; fall back
  // to the most recent active rule so gate-scoped rules still surface.
  const pick = active.find((r) => r.scope_type === "campus") ?? active[0];
  if (!pick) return null;
  return {
    id: pick.id,
    scopes: pick.scopes,
    message: pick.public_message,
  };
}

/**
 * Returns every ACTIVE + PENDING_PRINCIPAL lockdown rule whose expiry has
 * not passed. The scan service evaluates these against the scanned subject
 * via matchActiveLockdown; the SSE stream / gate desk renders them.
 */
export async function findActiveLockdownRules(): Promise<LockdownRule[]> {
  const { rows } = await query<LockdownRow>(
    `SELECT id, data, created_at, updated_at
       FROM lockdown_broadcasts
      WHERE (data->>'lifted_at') IS NULL
      ORDER BY created_at DESC
      LIMIT 25`,
  );
  const now = Date.now();
  return rows
    .map(toLockdownRule)
    .filter((r) => {
      if (r.status === "LIFTED" || r.status === "EXPIRED") return false;
      // Auto-expiry: an ACTIVE rule past its expires_at is skipped in the
      // evaluator (no need to write EXPIRED back).
      if (
        r.status === "ACTIVE" &&
        r.expires_at &&
        new Date(r.expires_at).getTime() <= now
      ) {
        return false;
      }
      return true;
    });
}

/**
 * All rules in a state the Principal/Admin consoles should surface:
 * ACTIVE + PENDING_PRINCIPAL + auto-expired ACTIVE. Excludes LIFTED.
 */
export async function findLockdownRulesForConsole(): Promise<LockdownRule[]> {
  const { rows } = await query<LockdownRow>(
    `SELECT id, data, created_at, updated_at
       FROM lockdown_broadcasts
      WHERE (data->>'lifted_at') IS NULL
      ORDER BY created_at DESC
      LIMIT 100`,
  );
  const now = Date.now();
  return rows
    .map(toLockdownRule)
    .filter((r) => {
      if (r.status === "LIFTED") return false;
      if (r.status === "EXPIRED") return false;
      // Mark an ACTIVE rule past its expiry as EXPIRED for display.
      if (
        r.status === "ACTIVE" &&
        r.expires_at &&
        new Date(r.expires_at).getTime() <= now
      ) {
        r.status = "EXPIRED";
      }
      return true;
    });
}
