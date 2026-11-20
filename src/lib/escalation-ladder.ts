/**
 * lib/escalation-ladder.ts — the routing table for "who acts next?"
 *
 * Each domain has an ordered chain of roles. `nextActor()` finds the
 * next role in the chain that can act, given the current role and the
 * reason the current actor was blocked.
 *
 * Design:
 *   - tier_too_low      → move one step up the chain
 *   - domain_mismatch   → skip to the first role in the chain that owns the domain
 *   - flag_blocked      → skip the flagged actor entirely, go one up
 *   - step_up_required  → stay at the same role (actor needs to re-auth, not route)
 *   - actor_suspended / actor_banned → skip them, go one up
 */

import type { Domain, CanAct } from "@/lib/permission-model";

// ── Ladder config ──────────────────────────────────────────────────────────
// Each entry is the ordered chain from lowest to highest authority.
// The actor's current role must appear in the chain for `nextActor`
// to work; if it doesn't, the function falls back to the full chain.

export const LADDER: Record<Domain, string[]> = {
  academics: ["faculty", "hod", "vice_principal", "principal"],
  hostel: ["caretaker", "warden", "deputy_warden", "hostel_manager", "principal"],
  mess: ["mess_incharge", "warden", "deputy_warden", "principal"],
  exam: ["exam_branch", "exam_superintendent", "vice_principal", "principal"],
  gate: ["operator", "supervisor", "warden", "principal"],
  gate_pass: ["operator", "supervisor", "warden", "deputy_warden", "principal"],
  medical: ["medical_officer", "warden", "principal"],
  finance: ["finance_officer", "deputy_warden", "principal"],
  infrastructure: ["caretaker", "admin", "sysadmin"],
  governance: ["admin", "principal", "sysadmin"],
  all: ["admin", "principal", "sysadmin"],
};

// ── nextActor ─────────────────────────────────────────────────────────────

export interface EscalationResult {
  /** The role to escalate to. */
  targetRole: string;
  /** Why we're escalating (the blocked reason). */
  blockedReason: string;
  /** Human-readable explanation for the audit log / UI. */
  explanation: string;
}

/**
 * Find the next role in the domain's ladder that can act.
 *
 * @param currentRole  The role that was blocked.
 * @param domain       The ticket's domain.
 * @param blocked      The CanAct result explaining why the current actor was blocked.
 * @returns            The next role + reason, or null if no one higher exists.
 */
export function nextActor(
  currentRole: string,
  domain: Domain,
  blocked: Extract<CanAct, { allowed: false }>,
): EscalationResult | null {
  const chain = LADDER[domain] ?? LADDER.all;
  const blockedReason = blocked.reason;

  // Find where the current role sits in the chain.
  const currentIdx = chain.indexOf(currentRole);

  // Determine how far to skip based on the block reason.
  let targetIdx: number;

  switch (blockedReason) {
    case "domain_mismatch":
      // Skip to the first role in the chain that owns this domain.
      // For domain-specific roles, the domain owner is later in the chain.
      // For "all" roles, the current role already has the domain — this
      // case shouldn't reach here, but we handle it gracefully.
      targetIdx = currentIdx + 1;
      break;

    case "flag_blocked":
    case "actor_suspended":
    case "actor_banned":
      // Skip the flagged/blocked actor entirely — go one up.
      targetIdx = currentIdx + 1;
      break;

    case "tier_too_low":
      // One step up is the minimum; but if the next role also has
      // insufficient tier, the caller should call nextActor again.
      targetIdx = currentIdx + 1;
      break;

    case "step_up_required":
      // The actor themselves needs to re-auth; no routing needed.
      return null;

    default:
      targetIdx = currentIdx + 1;
  }

  // Walk forward until we find a role that's actually in the chain.
  while (targetIdx < chain.length && !chain[targetIdx]) {
    targetIdx++;
  }

  if (targetIdx >= chain.length) {
    // No one higher in the chain — this is the last resort.
    return null;
  }

  const targetRole = chain[targetIdx];

  const explanations: Record<string, string> = {
    tier_too_low: `Tier insufficient — escalating from ${currentRole} to ${targetRole}`,
    domain_mismatch: `Domain "${domain}" not in ${currentRole}'s scope — routing to ${targetRole}`,
    flag_blocked: `Actor on flag — skipping ${currentRole}, routing to ${targetRole}`,
    actor_suspended: `Actor suspended — routing to ${targetRole}`,
    actor_banned: `Actor banned — routing to ${targetRole}`,
    step_up_required: `Step-up required — actor must re-authenticate`,
  };

  return {
    targetRole,
    blockedReason,
    explanation: explanations[blockedReason] ?? `Escalating from ${currentRole} to ${targetRole}`,
  };
}

/**
 * Check whether a forward-to-role is valid against the ladder.
 * Returns true if `targetRole` is above `currentRole` in the domain's chain.
 * Used by DeputyWardenCommandBar to validate `forward <ticket> to <role>`.
 */
export function isValidForward(
  currentRole: string,
  targetRole: string,
  domain: Domain,
): boolean {
  const chain = LADDER[domain] ?? LADDER.all;
  const currentIdx = chain.indexOf(currentRole);
  const targetIdx = chain.indexOf(targetRole);
  // Both must be in the chain and target must be strictly above.
  return currentIdx !== -1 && targetIdx !== -1 && targetIdx > currentIdx;
}

export default nextActor;
