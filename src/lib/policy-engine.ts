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
