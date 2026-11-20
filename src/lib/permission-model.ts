/**
 * lib/permission-model.ts — the unified Tier × Domain × Flag decision model.
 *
 * Every approver question ("can this actor act on this ticket?") is answered
 * by `canAct()`. The result is a discriminable `CanAct` type so callers can
 * branch on the specific reason and route accordingly.
 *
 * This is the single new core primitive; everything else composes it.
 */

import { getRoleTier } from "@/lib/alert-hierarchy";

// ── Domain ─────────────────────────────────────────────────────────────────

export type Domain =
  | "academics"
  | "hostel"
  | "mess"
  | "exam"
  | "gate"
  | "gate_pass"
  | "medical"
  | "finance"
  | "infrastructure"
  | "governance"
  | "all";

export const DOMAINS: Domain[] = [
  "academics",
  "hostel",
  "mess",
  "exam",
  "gate",
  "gate_pass",
  "medical",
  "finance",
  "infrastructure",
  "governance",
  "all",
];

// ── FlagLevel ──────────────────────────────────────────────────────────────

export type FlagLevel = "clear" | "watch" | "probation" | "suspended" | "banned";

export const FLAG_LEVELS: FlagLevel[] = [
  "clear",
  "watch",
  "probation",
  "suspended",
  "banned",
];

// ── Actor ──────────────────────────────────────────────────────────────────

export interface Actor {
  userId: string;
  role: string;
  /** Vertical power — from getRoleTier(role). */
  tier: number;
  /** Horizontal scope — which domains this actor can act in. */
  domains: Domain[];
  /** Accountability flag. "clear" = no active flag. */
  flag: FlagLevel;
  flagReason?: string;
  flagExpiresAt?: string;
  /** True when the actor has completed step-up auth for this session. */
  stepUpVerified: boolean;
}

// ── TicketRequirements ─────────────────────────────────────────────────────

export interface TicketRequirements {
  /** Minimum tier required to act. */
  requiredTier: number;
  /** Domain the ticket belongs to. */
  requiredDomain: Domain;
  /** Whether step-up auth is required for this action. */
  requiresStepUp: boolean;
  /** Which flag levels are allowed to act on this ticket.
   *  e.g. ["clear"] means only unflagged actors can approve. */
  allowedFlags?: FlagLevel[];
}

// ── CanAct ─────────────────────────────────────────────────────────────────

export type CanAct =
  | { allowed: true }
  | {
      allowed: false;
      reason:
        | "tier_too_low"
        | "domain_mismatch"
        | "flag_blocked"
        | "step_up_required"
        | "actor_suspended"
        | "actor_banned";
      /** Human-readable explanation for UI display. */
      message: string;
    };

// ── canAct ─────────────────────────────────────────────────────────────────

export function canAct(actor: Actor, req: TicketRequirements): CanAct {
  // Hard stops: suspended / banned actors cannot act on anything.
  if (actor.flag === "banned") {
    return {
      allowed: false,
      reason: "actor_banned",
      message: "Actor is banned and cannot take any action.",
    };
  }
  if (actor.flag === "suspended") {
    return {
      allowed: false,
      reason: "actor_suspended",
      message: "Actor is suspended and cannot take any action.",
    };
  }

  // Flag gate: ticket may restrict which flags can act.
  if (req.allowedFlags && req.allowedFlags.length > 0 && !req.allowedFlags.includes(actor.flag)) {
    return {
      allowed: false,
      reason: "flag_blocked",
      message: `Actor flag "${actor.flag}" not in allowed flags [${req.allowedFlags.join(", ")}].`,
    };
  }

  // Tier check.
  if (actor.tier < req.requiredTier) {
    return {
      allowed: false,
      reason: "tier_too_low",
      message: `Actor tier ${actor.tier} < required ${req.requiredTier}.`,
    };
  }

  // Domain check.
  const hasDomain = actor.domains.includes(req.requiredDomain) || actor.domains.includes("all");
  if (!hasDomain) {
    return {
      allowed: false,
      reason: "domain_mismatch",
      message: `Actor lacks domain "${req.requiredDomain}" (has: ${actor.domains.join(", ")}).`,
    };
  }

  // Step-up check.
  if (req.requiresStepUp && !actor.stepUpVerified) {
    return {
      allowed: false,
      reason: "step_up_required",
      message: "Step-up authentication is required for this action.",
    };
  }

  return { allowed: true };
}

// ── Actor factory helpers ──────────────────────────────────────────────────

/**
 * Build an Actor from a role + optional flag/domain overrides.
 * Tier is derived from getRoleTier; domains default to ["all"] for
 * high-tier roles, narrow domain sets for domain-specific roles.
 */
const ROLE_DOMAINS: Record<string, Domain[]> = {
  sysadmin: ["all"],
  admin: ["all"],
  principal: ["all"],
  vice_principal: ["all"],
  exam_branch: ["exam", "governance"],
  exam_superintendent: ["exam"],
  oie: ["all"],
  hostel_manager: ["hostel", "gate", "mess"],
  deputy_warden: ["hostel", "gate", "mess"],
  warden: ["hostel", "gate", "mess"],
  caretaker: ["hostel", "infrastructure"],
  hod: ["academics", "exam"],
  faculty: ["academics"],
  staff: ["academics", "infrastructure"],
  worker: ["infrastructure"],
  guardian: ["hostel"],
  student: ["gate_pass"],
  parent: ["gate_pass"],
  supervisor: ["gate", "gate_pass"],
  operator: ["gate", "gate_pass"],
  medical_officer: ["medical"],
  mess_incharge: ["mess"],
  finance_officer: ["finance"],
};

export function makeActor(
  userId: string,
  role: string,
  opts?: {
    flag?: FlagLevel;
    flagReason?: string;
    flagExpiresAt?: string;
    stepUpVerified?: boolean;
    domains?: Domain[];
  },
): Actor {
  return {
    userId,
    role,
    tier: getRoleTier(role),
    domains: opts?.domains ?? ROLE_DOMAINS[role] ?? ["all"],
    flag: opts?.flag ?? "clear",
    flagReason: opts?.flagReason,
    flagExpiresAt: opts?.flagExpiresAt,
    stepUpVerified: opts?.stepUpVerified ?? false,
  };
}

/** Convenience: build an Actor from a User object + optional flag fields. */
export function actorFromUser(
  user: { id: string; role?: string } & Record<string, unknown>,
  opts?: { flag?: FlagLevel; stepUpVerified?: boolean },
): Actor {
  const role = user.role ?? "student";
  return makeActor(user.id, role, {
    flag: opts?.flag ?? "clear",
    stepUpVerified: opts?.stepUpVerified ?? false,
  });
}

export default canAct;
