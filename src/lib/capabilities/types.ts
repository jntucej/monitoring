// src/lib/capabilities/types.ts
//
// The capability-based workspace model. Instead of "role → dashboard with
// hidden cards," the system resolves:
//
//   PERSON → LIFE/CAMPUS CONDITION → CURRENT TASK → CAPABILITIES → UI
//
// A capability is a named thing a person can see/do, gated by a pure
// condition over the WorkspaceContext. The resolver is PURE (no DB/fetch) so
// it runs identically server (enforcement) and client (UX projection).
//
// Guardrails this module encodes (see docs/student-personas-passes.md):
//   #1  server is the source of truth — the client only projects.
//   #2  security.* fail closed, ux.* fail open.
//   #4  one registry, pure conditions — no scattered `if (role === …)`.
//   #6  view ≠ act ≠ approve are separate capabilities.
//   #8  approval-stage eligibility is a capability, derived from the resolved
//       chain + role + delegation, not a hardcoded role.

/** Who the person is + their current life/campus state (request-scoped). */
export interface WorkspaceContext {
  personId: string;
  roles: string[];
  /** student | faculty | staff | operator | supervisor | principal | visitor | … */
  personType: string;
  /** day_scholar | hosteller | n_a */
  residentialStatus: "day_scholar" | "hosteller" | "n_a";
  gender?: string | null;
  hostel?: { blockId: string | null; roomId: string | null };
  /** in_campus | out_campus | unknown — recomputed per request, not at login. */
  campusStatus: "in_campus" | "out_campus" | "unknown";
  /** the student's current entry-type token (e.g. day_scholar / hosteller). */
  currentEntryType?: string | null;
  /** active gate passes / approvals this person holds right now. */
  activeAuthorizations: AccessAuthorization[];
  /** for operators: their assigned gate + shift (request-scoped). */
  currentShift?: string | null;
  assignedGate?: string | null;
  /** approval stages this person can act on (resolved, not hardcoded). */
  activeApprovals: ApprovalStage[];
  /** registry version so a stale client bundle can't drift (guardrail #13). */
  registryVersion: number;
}

export interface AccessAuthorization {
  kind:
    | "hostel_leave"
    | "campus_visitor_pass"
    | "temporary_gate_pass"
    | "official_duty"
    | "exam_authorization"
    | "worker_access"
    | "emergency_override";
  code: string;
  status: "active" | "expired" | "pending";
  /** expected return deadline (hostel leave / outpass). */
  expectedReturnAt?: string | null;
  /** parent acknowledgement state (two-party gate_passes). */
  parentAcknowledged?: boolean;
  /** hostel authority approved? */
  adminApproved?: boolean;
}

export interface ApprovalStage {
  stage: string;
  role: string;
  domain: string;
}

/**
 * A capability: a named thing, with a pure condition over context.
 * `class` splits security (fail closed) from ux (fail open) — guardrail #2.
 */
export interface CapabilityDef {
  id: string;
  /** "security" (deny on error/unknown) | "ux" (may fail open). */
  kind: "security" | "ux";
  /** short human label (for audit / explain-why). */
  label: string;
  /** pure predicate — MUST have no side effects, no DB, no fetch. */
  when: (ctx: WorkspaceContext) => boolean;
}

export type CapabilityId = string;

/** The registry is the SINGLE place "who sees what under which condition." */
export type CapabilityRegistry = CapabilityDef[];

/**
 * Guardrail #6/#8 helpers: separate view from act from approve, and derive
 * approval-stage eligibility from context + delegation, not a hardcoded role.
 */
export function hasCapability(
  defs: CapabilityDef[],
  ctx: WorkspaceContext,
  id: CapabilityId,
): boolean {
  const def = defs.find((d) => d.id === id);
  if (!def) return false; // unknown capability → fail closed
  try {
    return def.when(ctx);
  } catch {
    // guardrail #2: security capabilities fail closed on a resolver error.
    return def.kind === "ux";
  }
}

/**
 * Resolve the full capability set for a context. Pure, deterministic.
 *
 * Guardrail #2 semantics, precisely:
 *  - A capability whose `when()` THROWS (resolver error / unknown context):
 *      security → DENIED (fail closed)
 *      ux        → GRANTED (fail open, avoid blank screens)
 *  - A capability whose `when()` cleanly returns false → NOT granted
 *    (regardless of kind). "Fail open" is about *error/missing-context*, not
 *    "grant every ux cap." This is the distinction that prevents both
 *    lockouts and leaks.
 */
export function resolveCapabilities(
  defs: CapabilityRegistry,
  ctx: WorkspaceContext,
): CapabilityId[] {
  const out: CapabilityId[] = [];
  for (const def of defs) {
    let matched = false;
    let threw = false;
    try {
      matched = def.when(ctx);
    } catch {
      threw = true;
    }
    const allowed = threw ? def.kind === "ux" : matched;
    if (allowed) out.push(def.id);
  }
  return out;
}

/**
 * Per-id decision with the fail-mode made explicit (for audit / explain-why).
 * A throwing security cap → denied + "closed"; a throwing ux cap → granted + "open".
 */
export function capabilityDecision(
  def: CapabilityDef,
  ctx: WorkspaceContext,
): { id: string; allowed: boolean; failMode: "closed" | "open"; matched: boolean } {
  let matched = false;
  let threw = false;
  try {
    matched = def.when(ctx);
  } catch {
    threw = true;
  }
  const allowed = threw ? def.kind === "ux" : matched;
  return { id: def.id, allowed, matched, failMode: def.kind === "security" ? "closed" : "open" };
}
