// src/lib/institutional/sod.ts
//
// PR-14 — Separation-of-Duties + Security hardening (the adversarial
// layer). The institutional loop (PR-02..13) makes every consequential
// action a durable decision that pins actor + role_context +
// authority_source + the exact policy + the delegation grant. PR-14
// is the layer that ATTACKS that architecture: it answers "can a
// revoked pass stay valid?" / "can an expired delegation still
// work?" / "can the same person satisfy both sides of a two-person
// rule?" / "can a role_context be forged?"
//
// These are pure checks (no side effects) that a decision or an
// emergency command must pass before execution. A check that fails is
// the one thing that should block a consequential action.
//
// Compose, don't fork:
//   * maker-checker (the two-person rule) reuses the EXISTING
//     pending_approvals constraint (maker_ne_checker) — the SoD check
//     is the query that a candidate checker satisfies that constraint.
//   * delegation expiry reuses the EXISTING delegations table (the
//     active-window check is the same query PR-04's authorize() runs).
//   * revocation reuses the gate_passes / active-pass state.

import type {
  Actor,
} from "@/lib/institutional/contracts";

// ── Two-person rule (maker ≠ checker) ───────────────────────────────────

/**
 * The two-person rule: the actor who made the request may not be the
 * one who approves it. This is the maker-checker SoD check — the same
 * invariant the `pending_approvals` table enforces in the DB
 * (maker_ne_checker CHECK). The engine check is the pre-execution
 * version of that constraint.
 */
export function canBeChecker(
  makerId: string,
  checker: Actor,
): { ok: boolean; reason?: string } {
  if (checker.id === makerId) {
    return { ok: false, reason: "SoD: the maker of a request may not be its checker (two-person rule)" };
  }
  return { ok: true };
}

// ── Delegation expiry ────────────────────────────────────────────────────

/**
 * An active, unrevoked, in-window delegation is the ONLY way a
 * delegatee may act under a delegated role. The check is: not revoked,
 * the window is open (starts_at <= now < expires_at), and the scope
 * matches (or is campus-wide). An expired or revoked delegation must
 * NOT work — that is the "can an expired delegation still work?"
 * adversarial question, and the answer is no.
 */
export function isDelegationActive(
  d: {
    revoked_at: string | null;
    starts_at: string;
    expires_at: string;
    scope_entity?: string | null;
  },
  scope: string | null,
  now: Date = new Date(),
): { active: boolean; reason?: string } {
  if (d.revoked_at) {
    return { active: false, reason: "delegation was revoked — it no longer grants authority" };
  }
  const starts = new Date(d.starts_at).getTime();
  const expires = new Date(d.expires_at).getTime();
  const t = now.getTime();
  if (t < starts) {
    return { active: false, reason: "delegation window has not opened yet" };
  }
  if (t >= expires) {
    return { active: false, reason: "delegation window has closed — an expired delegation must not work" };
  }
  if (d.scope_entity && scope && d.scope_entity !== scope) {
    return { active: false, reason: `delegation scope (${d.scope_entity}) does not cover the requested scope (${scope})` };
  }
  return { active: true };
}

// ── Scope containment ────────────────────────────────────────────────────

/**
 * "Can a delegated authority exceed its scope?" — a delegation to a
 * role within a specific scope (e.g. hostel_block BOYS_A) must not
 * grant authority over a wider scope (institution). The check is
 * scope containment: the requested scope must be within (or equal to)
 * the grant's scope.
 */
export function scopeContained(
  grantScope: string | null,
  requestedScope: string | null,
): { ok: boolean; reason?: string } {
  // A campus-wide / institution grant covers everything.
  if (grantScope === null || grantScope === "institution" || grantScope === "campus_wide") {
    return { ok: true };
  }
  // A scoped grant only covers its own scope (not a wider one).
  if (requestedScope === null || requestedScope === "institution" || requestedScope === "campus_wide") {
    return { ok: false, reason: "a scoped grant does not cover a campus-wide request" };
  }
  if (grantScope !== requestedScope) {
    return { ok: false, reason: `grant scope '${grantScope}' does not cover requested scope '${requestedScope}'` };
  }
  return { ok: true };
}

// ── Self-approval (a principal cannot approve their own request) ────────

/**
 * "Can Principal approve their own request?" — no. A request the
 * actor originated may not be approved by the same actor, even at the
 * highest authority. This is the SoD self-approval check.
 */
export function canSelfApprove(
  requestOriginatorId: string,
  approver: Actor,
): { ok: boolean; reason?: string } {
  if (approver.id === requestOriginatorId) {
    return { ok: false, reason: "SoD: an actor may not approve a request they originated" };
  }
  return { ok: true };
}

// ── Revocation ───────────────────────────────────────────────────────────

/**
 * "Can a revoked pass remain valid?" — no. A pass (or authority) that
 * has been revoked must not execute. The check is the revocation
 * state: a revoked record is terminal.
 */
export function isPassValid(
  p: { status: string; revoked_at: string | null },
): { valid: boolean; reason?: string } {
  if (p.revoked_at || p.status === "REVOKED" || p.status === "EXPIRED") {
    return { valid: false, reason: "the pass is revoked/expired — it must not be valid" };
  }
  return { valid: true };
}

// ── The combined SoD gate (one entry point) ─────────────────────────────

export interface SoDCheckInput {
  /** The actor acting. */
  actor: Actor;
  /** The id of the user who originated the request (for self-approval + maker-checker). */
  requestOriginatorId?: string;
  /** A candidate checker (for the two-person rule). */
  checkerId?: string;
  /** The delegation grant the actor is acting under (if any). */
  delegation?: {
    revoked_at: string | null;
    starts_at: string;
    expires_at: string;
    scope_entity?: string | null;
  };
  /** The scope the action is requested over. */
  scope?: string | null;
  /** The pass / authority being executed (for revocation). */
  pass?: { status: string; revoked_at: string | null };
  now?: Date;
}

export interface SoDResult {
  ok: boolean;
  /** The specific check that failed (empty when ok). */
  blockedBy: string[];
}

/**
 * The combined SoD gate: a consequential action passes ONLY when every
 * check holds. This is the adversarial layer — it is what a decision /
 * emergency command calls before execution. Any single failed check
 * blocks the action (fail-closed).
 */
export function checkSoD(input: SoDCheckInput): SoDResult {
  const blockedBy: string[] = [];

  // Two-person rule: the checker (or, absent a separate checker, the
  // actor) must not be the originator.
  const checkerId = input.checkerId ?? input.actor.id;
  if (input.requestOriginatorId && checkerId === input.requestOriginatorId) {
    blockedBy.push("SoD: the actor may not check/approve a request they originated (two-person rule)");
  }

  // Delegation: if acting under a delegation, it must be active + in scope.
  if (input.delegation) {
    const dl = isDelegationActive(input.delegation, input.scope ?? null, input.now);
    if (!dl.active) blockedBy.push(dl.reason ?? "delegation is not active");
    else {
      const sc = scopeContained(input.delegation.scope_entity ?? null, input.scope ?? null);
      if (!sc.ok) blockedBy.push(sc.reason ?? "delegation scope does not cover the request");
    }
  }

  // Revocation: the pass/authority being executed must not be revoked.
  if (input.pass) {
    const pv = isPassValid(input.pass);
    if (!pv.valid) blockedBy.push(pv.reason ?? "the pass is revoked");
  }

  return { ok: blockedBy.length === 0, blockedBy };
}
