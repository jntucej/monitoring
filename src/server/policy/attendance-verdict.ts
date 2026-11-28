/**
 * Server-side resolver for the JJR-agnostic attendance / hall-ticket verdict.
 *
 * Reads REAL data only (no fabrication):
 *   - threshold + condonation floor <- config_exam_eligibility_rules (live row)
 *   - present/total attendance       <- attendance_records (person_id = user)
 *   - condonation state             <- attendance_condonations (new table)
 *   - debar flag                    <- academic-status source
 *
 * The mid-term +2 bonus has NO per-subject source in the current schema, so it
 * is passed as bonusEvents = 0 (no fabricated credit). When a mid-term
 * appearance source is added, wire it here — the engine already supports it.
 */

import { query } from "@/lib/postgres";
import {
  evaluateAttendanceByPolicy,
  condonationEligible,
  type PolicyConfig,
  type HallTicketVerdict,
} from "@/lib/policy-engine";

/** Load the live policy config (threshold + condonation floor). */
export async function loadPolicyConfig(): Promise<PolicyConfig> {
  const { rows } = await query<{
    min_attendance_pct: string;
    condonation_min_pct: string | null;
  }>(
    `SELECT min_attendance_pct, condonation_min_pct
       FROM public.config_exam_eligibility_rules ORDER BY id LIMIT 1`,
  );
  // Fallbacks mirror /api/exam/eligibility-rules; condonation floor defaults
  // to 65 when the column is absent (legacy rows) so behavior is safe.
  return {
    eligibleMinPct: Number(rows[0]?.min_attendance_pct ?? 75),
    condonationMinPct: Number(rows[0]?.condonation_min_pct ?? 65),
    bonusPeriods: 0,
    detentionForfeitsCieMarks: true,
  };
}

export interface VerdictInput {
  userId: string;
  /** Academic year (optional; used to scope the active condonation lookup). */
  academicYear?: string;
}

export interface AttendanceVerdict extends HallTicketVerdict {
  config: PolicyConfig;
  /** Whether a condonation application is the correct remedy right now. */
  condonationRemedyAvailable: boolean;
  /** The active (non-rejected) condonation, if any. */
  activeCondonation: {
    id: string;
    status: string;
    grounds_category: string;
    fee_cleared: boolean;
  } | null;
}

export async function resolveAttendanceVerdict(
  input: VerdictInput,
): Promise<AttendanceVerdict> {
  const config = await loadPolicyConfig();

  // 1. Real aggregate attendance for this user.
  const { rows: attRows } = await query<{ present: number; total: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'PRESENT')::int AS present,
       COUNT(*)::int AS total
     FROM public.attendance_records
    WHERE person_id = $1::uuid`,
    [input.userId],
  );
  const attended = Number(attRows[0]?.present ?? 0);
  const conducted = Number(attRows[0]?.total ?? 0);

  // 2. Active condonation for this user (not rejected, current year if given).
  const condWhere = input.academicYear
    ? `AND academic_year = $2`
    : "";
  const condParams = input.academicYear ? [input.userId, input.academicYear] : [input.userId];
  const { rows: condRows } = await query<{
    id: string;
    status: string;
    grounds_category: string;
    fee_cleared: boolean;
  }>(
    `SELECT id, status, grounds_category, fee_cleared
       FROM public.attendance_condonations
      WHERE student_id = $1::uuid AND status <> 'REJECTED' ${condWhere}
      ORDER BY created_at DESC NULLS LAST
      LIMIT 1`,
    condParams,
  );
  const activeCondonation = condRows[0]
    ? {
        id: condRows[0].id,
        status: condRows[0].status,
        grounds_category: condRows[0].grounds_category,
        fee_cleared: condRows[0].fee_cleared,
      }
    : null;
  const hasApprovedCacCondonation = activeCondonation?.status === "APPROVED";
  const condonationFeeCleared = hasApprovedCacCondonation
    ? !!activeCondonation?.fee_cleared
    : false;

  // 3. Debar flag (student_details.academic_status: DEBARRED / SUSPENDED).
  const { rows: statusRows } = await query<{ academic_status: string }>(
    `SELECT academic_status FROM public.student_details
      WHERE user_id = $1::uuid LIMIT 1`,
    [input.userId],
  );
  const debarStatus = statusRows[0]?.academic_status ?? null;
  const isDebarred = debarStatus === "DEBARRED" || debarStatus === "SUSPENDED";

  // 4. Evaluate (pure).
  const verdict = evaluateAttendanceByPolicy(
    {
      attendedPeriods: attended,
      conductedPeriods: conducted,
      bonusEvents: 0, // no mid-term source in current schema -> 0, never fabricated
      hasApprovedCacCondonation,
      condonationFeeCleared,
      isDebarred,
    },
    config,
  );

  return {
    ...verdict,
    config,
    condonationRemedyAvailable:
      !verdict.hallTicketLocked &&
      !isDebarred &&
      conducted > 0 &&
      condonationEligible(verdict.aggregatePct, config),
    activeCondonation,
  };
}
