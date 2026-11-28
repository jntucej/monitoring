import { LockedError } from "@/server/http/errors";

/**
 * Rule-based lockdown engine.
 *
 * Lockdowns are stored in the generic `lockdown_broadcasts` table whose
 * payload lives in the `data` JSONB column (CEJ-96: there are no dedicated
 * rule columns on the stub table). The engine extends that JSONB payload with
 * rule fields so a single lockdown can target anything from one roll number
 * to the entire campus, with direction control and time-boxed auto-expiry —
 * without a risky schema migration on a shared stub table.
 */

export type LockdownScopeType =
  | "campus"
  | "gate"
  | "role"
  | "persona"
  | "department"
  | "hostel_block"
  | "class_section"
  | "user";

export type LockdownDirection = "IN" | "OUT" | "BOTH";
export type LockdownStatus = "PENDING_PRINCIPAL" | "ACTIVE" | "LIFTED" | "EXPIRED";

/** A fully-typed lockdown rule as it is evaluated on a gate scan. */
export interface LockdownRule {
  id: string;
  /**
   * Scope type. Legacy rows have no `scope_type` in their JSONB payload;
   * those are treated as `campus` (the original global-boolean behavior) so
   * existing lockdowns keep working.
   */
  scope_type: LockdownScopeType;
  /** e.g. [gateId...] / ['visitor'] / ['hosteller'] / [hostelBlock] / [userId]. Empty for campus. */
  target_values: string[];
  /** IN / OUT / BOTH. Legacy rows default to BOTH. */
  direction: LockdownDirection;
  /** PENDING_PRINCIPAL | ACTIVE | LIFTED | EXPIRED. Only ACTIVE rules block. */
  status: LockdownStatus;
  /** Safe human message shown to operators & affected users (no UUIDs). */
  public_message: string | null;
  /** ISO timestamp after which the rule auto-expires (treated as EXPIRED). */
  expires_at: string | null;
  initiated_by: string | null;
  approved_by: string | null;
  lifted_by: string | null;
  lift_reason: string | null;
  /** P0 evacuation: permits OUT (egress) while blocking IN. */
  evacuation: boolean;
  /** The full scopes[] array (legacy field, kept for backward compat). */
  scopes: string[];
  /** When the rule was issued (start of the lockdown window). */
  started_at: string | null;
}

/** The subset of a scanned person's identity the evaluator needs. */
export interface LockdownCheckSubject {
  userId: string;
  role: string;
  persona?: "hosteller" | "day_scholar" | null;
  departmentCode?: string | null;
  hostelBlock?: string | null;
  classId?: string | null;
  gateId: string;
  direction: "IN" | "OUT";
}

/**
 * Returns the first ACTIVE, not-yet-expired rule that matches the subject,
 * or null. Direction is honored: a BOTH rule matches any direction; a
 * direction-specific rule only matches that direction.
 *
 * Matching is first-match by scope breadth (most-specific first) so a
 * `user`-scoped rule wins over a `campus`-scoped one when both are active.
 */
export function matchActiveLockdown(
  rules: LockdownRule[],
  subject: LockdownCheckSubject,
): LockdownRule | null {
  const now = Date.now();

  // Most-specific scopes first so a narrow rule shadows a broad one.
  const SPECIFICITY: Record<LockdownScopeType, number> = {
    user: 8,
    gate: 7,
    class_section: 6,
    hostel_block: 5,
    department: 4,
    persona: 3,
    role: 2,
    campus: 1,
  };
  const active = rules
    .filter((r) => {
      if (r.status !== "ACTIVE") return false;
      if (r.expires_at && new Date(r.expires_at).getTime() <= now) return false;
      if (r.direction !== "BOTH" && r.direction !== subject.direction) return false;
      return true;
    })
    .sort((a, b) => (SPECIFICITY[b.scope_type] ?? 0) - (SPECIFICITY[a.scope_type] ?? 0));

  for (const rule of active) {
    const match = matchesSubject(rule, subject);
    if (match) {
      // Evacuation rules permit OUT (egress); only block the IN side.
      if (rule.evacuation && subject.direction === "OUT") continue;
      return rule;
    }
  }
  return null;
}

function matchesSubject(rule: LockdownRule, subject: LockdownCheckSubject): boolean {
  const tv = rule.target_values;
  switch (rule.scope_type) {
    case "campus":
      return true;
    case "gate":
      return tv.includes(subject.gateId);
    case "role":
      return tv.includes(subject.role);
    case "persona":
      return !!subject.persona && tv.includes(subject.persona);
    case "department":
      return !!subject.departmentCode && tv.includes(subject.departmentCode);
    case "hostel_block":
      return !!subject.hostelBlock && tv.includes(subject.hostelBlock);
    case "class_section":
      return !!subject.classId && tv.includes(subject.classId);
    case "user":
      return tv.includes(subject.userId);
    default:
      return false;
  }
}

export interface ActiveLockdown {
  id: string;
  scopes: string[];
  message: string | null;
}

/**
 * Legacy global / gate-only check. Throws LockedError if the campus (or the
 * specific gate) is under a *non-scoped* lockdown. Kept so the fast
 * step-1 path in recordScan still blocks campus-wide + gate rules before the
 * subject is resolved. Scoped rules (role/persona/dept/hostel/class/user) are
 * NOT evaluated here — they need the subject, so recordScan runs a second
 * subject-aware check via matchActiveLockdown after person resolution.
 */
export function assertNotLockedOut(
  lockdown: ActiveLockdown | null,
  gateId: string,
): void {
  if (!lockdown) return;

  const global = lockdown.scopes.length === 0 || lockdown.scopes.includes("all");
  const gateScoped = lockdown.scopes.includes(gateId);

  if (global || gateScoped) {
    throw new LockedError(lockdown.message ?? "Campus lockdown is active");
  }
}

/** Convenience: build a subject from a resolved person + scan context. */
export function buildLockdownSubject(
  person: { id: string; role: string },
  ctx: {
    gateId: string;
    direction: "IN" | "OUT";
    persona?: "hosteller" | "day_scholar" | null;
    departmentCode?: string | null;
    hostelBlock?: string | null;
    classId?: string | null;
  },
): LockdownCheckSubject {
  return {
    userId: person.id,
    role: person.role,
    persona: ctx.persona ?? null,
    departmentCode: ctx.departmentCode ?? null,
    hostelBlock: ctx.hostelBlock ?? null,
    classId: ctx.classId ?? null,
    gateId: ctx.gateId,
    direction: ctx.direction,
  };
}
