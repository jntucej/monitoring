/**
 * JJR-agnostic, CONFIG-DRIVEN attendance / hall-ticket policy engine.
 *
 * Design (adapted from the JJR23 spec to the deployed data model):
 *   - No threshold is hardcoded here. The caller passes `config` read from
 *     `config_exam_eligibility_rules` (the live source of truth) plus the
 *     condonation band. Changing a threshold = a DB row change, zero code.
 *   - `bonuses` (e.g. +2 periods per theory mid-term appeared) is a config
 *     field defaulting to 0. Because attendance_records has NO per-subject /
 *     mid-term-appearance source in the current schema, the bonus is 0 unless
 *     the caller supplies real counts — we never fabricate credit.
 *   - The verdict is pure: given facts + config, return a HallTicketVerdict.
 *
 * This single function backs:
 *   - GET /api/student/attendance/threshold  (the JJR23-aware upgrade)
 *   - GET /api/exam/hall-ticket-eligibility  (the lock decision)
 *   - the nightly <75% alert worker
 */

export interface PolicyConfig {
  /** Exam-eligibility threshold, e.g. 75 (from config_exam_eligibility_rules.min_attendance_pct). */
  eligibleMinPct: number;
  /** Below this the student is DETAINED (hall ticket locked + CIE forfeited). */
  condonationMinPct: number;
  /** Periods credited per configured bonus event (defaults to 0 = none). */
  bonusPeriods?: number;
  /** Whether a detention forfeits CIE marks. */
  detentionForfeitsCieMarks?: boolean;
}

export interface AttendanceFacts {
  attendedPeriods: number;
  conductedPeriods: number;
  /** Real, caller-supplied bonus-event count (e.g. mid-term theory appearances). 0 when unknown. */
  bonusEvents?: number;
  hasApprovedCacCondonation: boolean;
  condonationFeeCleared: boolean;
  isDebarred: boolean;
}

export type HallTicketStatus =
  | "ELIGIBLE"
  | "CONDONATION_REQUIRED"
  | "CONDONATION_APPROVED"
  | "DETAINED"
  | "DEBARRED";

export interface HallTicketVerdict {
  effectiveAttended: number;
  conductedPeriods: number;
  aggregatePct: number;
  status: HallTicketStatus;
  hallTicketLocked: boolean;
  forfeitCieMarks: boolean;
  /**
   * When >= eligibleMinPct: how many "safe bunks" remain above the threshold.
   * When < eligibleMinPct: how many more attended classes are needed to reach it.
   */
  safeBunksOrNeeded: { type: "SAFE_BUNKS" | "CLASSES_NEEDED"; count: number };
}

export function evaluateAttendanceByPolicy(
  facts: AttendanceFacts,
  config: PolicyConfig,
): HallTicketVerdict {
  const bonusPeriods = Math.max(0, config.bonusPeriods ?? 0);
  const bonusEvents = Math.max(0, Math.floor(facts.bonusEvents ?? 0));
  const effectiveAttended = facts.attendedPeriods + bonusEvents * bonusPeriods;
  const conducted = Math.max(0, facts.conductedPeriods);
  const aggregatePct =
    conducted > 0 ? Number(((effectiveAttended / conducted) * 100).toFixed(2)) : 100;

  const forfeitCie = config.detentionForfeitsCieMarks !== false;

  const safeBunksOrNeeded: HallTicketVerdict["safeBunksOrNeeded"] =
    aggregatePct >= config.eligibleMinPct
      ? { type: "SAFE_BUNKS", count: Math.max(0, Math.floor(effectiveAttended / (config.eligibleMinPct / 100) - conducted)) }
      : {
          type: "CLASSES_NEEDED",
          count: Math.max(0, Math.ceil(((config.eligibleMinPct / 100) * conducted - effectiveAttended) / (1 - config.eligibleMinPct / 100))),
        };

  if (facts.isDebarred) {
    return {
      effectiveAttended,
      conductedPeriods: conducted,
      aggregatePct,
      status: "DEBARRED",
      hallTicketLocked: true,
      forfeitCieMarks: false,
      safeBunksOrNeeded,
    };
  }

  if (aggregatePct < config.condonationMinPct) {
    return {
      effectiveAttended,
      conductedPeriods: conducted,
      aggregatePct,
      status: "DETAINED",
      hallTicketLocked: true,
      forfeitCieMarks: forfeitCie,
      safeBunksOrNeeded,
    };
  }

  if (aggregatePct < config.eligibleMinPct) {
    const cleared = facts.hasApprovedCacCondonation && facts.condonationFeeCleared;
    return {
      effectiveAttended,
      conductedPeriods: conducted,
      aggregatePct,
      status: cleared ? "CONDONATION_APPROVED" : "CONDONATION_REQUIRED",
      hallTicketLocked: !cleared,
      forfeitCieMarks: false,
      safeBunksOrNeeded,
    };
  }

  return {
    effectiveAttended,
    conductedPeriods: conducted,
    aggregatePct,
    status: "ELIGIBLE",
    hallTicketLocked: false,
    forfeitCieMarks: false,
    safeBunksOrNeeded,
  };
}

/**
 * True when a condonation application is the right remedy for this student:
 * they are in the condonation band (condonationMinPct <= pct < eligibleMinPct).
 * Used by the Condonation Composer to gate when it unlocks.
 */
export function condonationEligible(
  aggregatePct: number,
  config: PolicyConfig,
): boolean {
  return aggregatePct >= config.condonationMinPct && aggregatePct < config.eligibleMinPct;
}

// ═══════════════════════════════════════════════════════════════════════
// GENERIC DECLARATIVE POLICY ENGINE (JSONLogic)
//
// Reads policy trees from the `academic_policy_rules` JSONB table and
// evaluates them. Adding a curriculum (JJR27, M.Tech, …) = new DB rows,
// zero code deploy. Backs the dual-regulation test + any future policy.
//
// Custom operators are registered via json-logic-engine's addMethod, whose
// FIRST argument is the already-evaluated operand array.
// ═══════════════════════════════════════════════════════════════════════

import { LogicEngine } from "json-logic-engine";

export interface EvaluationContext {
  /** Flat facts the JSONLogic `var` nodes resolve against. */
  metrics: Record<string, unknown>;
  request?: Record<string, unknown>;
  system?: Record<string, unknown>;
}

export class PolicyExecutionEngine {
  private engine: InstanceType<typeof LogicEngine>;

  constructor() {
    this.engine = new LogicEngine();
    this.registerCustomOperators();
  }

  /**
   * json-logic-engine custom operators are invoked as
   * `fn(operandArray, data, path, options)` — the FIRST arg is the full
   * already-evaluated operand array.
   */
  private registerCustomOperators(): void {
    this.engine.addMethod("has_minimum_credit_ratio", (operands: unknown[]) => {
      const [secured, total, ratio] = operands as [number, number, number];
      return total > 0 ? secured / total >= ratio : false;
    });

    this.engine.addMethod("within_working_days", (operands: unknown[]) => {
      const [submittedAt, eventDate, maxDays] = operands as [string, string, number];
      const diffMs = Math.abs(new Date(submittedAt).getTime() - new Date(eventDate).getTime());
      return diffMs / (1000 * 60 * 60 * 24) <= maxDays;
    });
  }

  /** Evaluate a single JSONLogic tree against the context. */
  public evaluate<T = unknown>(ruleTree: unknown, context: EvaluationContext): T {
    try {
      return this.engine.run(ruleTree as object, context.metrics) as T;
    } catch (err) {
      throw new Error(`Rule Execution Fault: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Walk a tiered policy (`rules[]`) and return the first matching tier.
   * This is the declarative replacement for hardcoded attendance if/else.
   */
  public evaluateTieredAttendance(
    policy: {
      rules: Array<{ tier: string; condition: unknown; action: Record<string, unknown> }>;
    },
    context: EvaluationContext,
  ): { tier: string; action: Record<string, unknown> } | null {
    for (const rule of policy.rules ?? []) {
      const holds = this.engine.run(rule.condition as object, context.metrics) as unknown;
      if (holds) return { tier: rule.tier, action: rule.action };
    }
    return null;
  }
}

/** Module-level singleton (stateless, safe for reads). */
export const policyEngine = new PolicyExecutionEngine();
