/**
 * lib/conduct.ts — Code-of-conduct ledger + flag derivation logic.
 *
 * Auto-flag rules: when a user accumulates enough events of a type
 * within a window, their flag level escalates automatically.
 *
 * FLAG_RULES drives `deriveFlag()` which the conduct_flags table
 * materializes on each event insert.
 */

import type { FlagLevel } from "@/lib/permission-model";

// ── Event types ────────────────────────────────────────────────────────────

export type ConductEventType =
  | "late_return"
  | "curfew_breach"
  | "quota_abuse"
  | "false_dispute"
  | "doc_fraud"
  | "repeated_complaint_subject"
  | "manual";

export type ConductSeverity = "minor" | "major" | "critical";

export interface ConductEvent {
  id: string;
  userId: string;
  eventType: ConductEventType;
  severity: ConductSeverity;
  domain: string;
  description: string;
  evidenceUrl?: string;
  recordedBy: string;
  ticketId?: string;
  expiresAt?: string;
  reversed: boolean;
  reversalReason?: string;
  createdAt: string;
}

// ── Flag rules ─────────────────────────────────────────────────────────────
// Each rule: when count >= N events of type T within window W, set flag to F.
// Rules are evaluated in order; the highest flag wins.

export interface FlagRule {
  eventType: ConductEventType;
  count: number;
  windowDays: number;
  flag: FlagLevel;
}

export const FLAG_RULES: FlagRule[] = [
  { eventType: "late_return", count: 1, windowDays: 30, flag: "watch" },
  { eventType: "late_return", count: 3, windowDays: 30, flag: "probation" },
  { eventType: "curfew_breach", count: 1, windowDays: 7, flag: "probation" },
  { eventType: "curfew_breach", count: 2, windowDays: 7, flag: "suspended" },
  { eventType: "doc_fraud", count: 1, windowDays: 365, flag: "suspended" },
  { eventType: "quota_abuse", count: 3, windowDays: 30, flag: "watch" },
  { eventType: "false_dispute", count: 2, windowDays: 30, flag: "watch" },
  { eventType: "repeated_complaint_subject", count: 3, windowDays: 30, flag: "probation" },
];

// ── deriveFlag ─────────────────────────────────────────────────────────────

/**
 * Given a user's active (non-reversed) events, derive their current flag
 * level by evaluating FLAG_RULES. The most severe flag wins.
 */
export function deriveFlag(events: ConductEvent[]): {
  flag: FlagLevel;
  reason: string;
  triggeredByEventId: string | null;
} {
  const FLAG_SEVERITY: Record<FlagLevel, number> = {
    clear: 0,
    watch: 1,
    probation: 2,
    suspended: 3,
    banned: 4,
  };

  // Only count active events.
  const active = events.filter((e) => !e.reversed);

  let best: { flag: FlagLevel; reason: string; eventId: string | null } = {
    flag: "clear",
    reason: "",
    eventId: null,
  };

  for (const rule of FLAG_RULES) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - rule.windowDays);
    const cutoffIso = cutoff.toISOString();

    const matching = active.filter(
      (e) =>
        e.eventType === rule.eventType &&
        e.createdAt >= cutoffIso
    );

    if (matching.length >= rule.count && FLAG_SEVERITY[rule.flag] > FLAG_SEVERITY[best.flag]) {
      // Pick the most recent matching event as the trigger.
      const triggered = matching[matching.length - 1];
      best = {
        flag: rule.flag,
        reason: `${matching.length} × ${rule.eventType} in ${rule.windowDays}d → ${rule.flag}`,
        eventId: triggered.id,
      };
    }
  }

  return {
    flag: best.flag,
    reason: best.reason,
    triggeredByEventId: best.eventId,
  };
}

// ── Conduct policy config (admin-editable in Phase 5) ─────────────────────

export interface CoCPolicy {
  id: string;
  domain: string;
  rule: string;
  appliesTo: FlagLevel[];
  action: "block" | "require_stepup" | "require_dual" | "notify_supervisor";
  params?: Record<string, unknown>;
}

export const COC_POLICIES: CoCPolicy[] = [
  {
    id: "outpass-probation",
    domain: "hostel",
    rule: "Outpass approval requires subject not on probation or worse",
    appliesTo: ["probation", "suspended", "banned"],
    action: "block",
  },
  {
    id: "stepup-watch",
    domain: "all",
    rule: "Watch-flagged actors must re-authenticate for approvals",
    appliesTo: ["watch"],
    action: "require_stepup",
  },
  {
    id: "dual-probation",
    domain: "all",
    rule: "Probation-flagged requests need co-sign from tier+1",
    appliesTo: ["probation"],
    action: "require_dual",
  },
  {
    id: "notify-curfew",
    domain: "hostel",
    rule: "Curfew breach notifies warden + parent immediately",
    appliesTo: ["clear", "watch", "probation"],
    action: "notify_supervisor",
  },
];

/**
 * Check whether a CoC policy blocks the actor from acting on a ticket.
 * Returns the matched policy or null if the actor is clear.
 */
export function findBlockingPolicy(
  actorFlag: FlagLevel,
  domain: string,
): CoCPolicy | null {
  for (const policy of COC_POLICIES) {
    if (
      (policy.domain === "all" || policy.domain === domain) &&
      policy.appliesTo.includes(actorFlag) &&
      (policy.action === "block" || policy.action === "require_dual")
    ) {
      return policy;
    }
  }
  return null;
}

export default { deriveFlag, FLAG_RULES, COC_POLICIES };
