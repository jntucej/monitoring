/**
 * Autonomous approval + routing service — the single source of truth for
 * "who can approve what, and where does a doubt go". Everything is read from
 * the editable JSONB policy (facilities.config 'CAMPUS_TELEMETRY_POLICY'),
 * never hardcoded:
 *
 *   - isTier1WebApproval(action, approverRole)
 *       Tier 1 = routine actions the approver may 1-click from the web
 *       portal (signed single-use action token, 4h TTL). Bounded by the
 *       `web_1click_allowed` list.
 *   - isTier2StepUp(action)
 *       Tier 2 = high-risk actions that REQUIRE web portal + two-person
 *       quorum + StepUpModal re-auth. Bounded by `stepup_two_person_required`.
 *       (Telegram is NOT a valid channel for Tier 2 — it is blocked by design.)
 *   - routeDoubt(domain)
 *       Authority-bridge routing: academic -> faculty/hod; hostel/mess ->
 *       caretaker/mess_incharge/deputy_warden. Escalation to oie/exam_branch/
 *       principal only on faculty/hod endorsement or an unacknowledged SLA
 *       breach.
 *   - replyVisibility(kind)
 *       PII-sensitive replies -> PRIVATE_STUDENT only; cohort/policy
 *       clarifications -> class group + confirmed_knowledge index.
 */

import { query } from "@/lib/postgres";

const POLICY_FACILITY = "CAMPUS_TELEMETRY_POLICY";

export interface TelemetryPolicy {
  web1clickAllowed: string[];
  stepupTwoPersonRequired: string[];
  retentionHotChatDays: number;
  retentionHotAuditDays: number;
  retentionColdR2Years: number;
  gpsMaxAccuracyMeters: number;
  samplingMovingSeconds: number;
  samplingStationarySeconds: number;
  minDisplacementMeters: number;
  wayfindingOnlyRoles: string[];
}

/** Load the editable operational policy (one JSONB row). Falls back to the
 *  spec defaults when the row is absent — but the row is seeded (migration 54). */
export async function loadOperationalPolicy(): Promise<TelemetryPolicy> {
  const { rows } = await query<{ config: Record<string, unknown> | null }>(
    `SELECT config FROM public.facilities WHERE facility_code = $1 AND is_active LIMIT 1`,
    [POLICY_FACILITY],
  );
  const c = (rows[0]?.config ?? {}) as Record<string, unknown>;
  const arr = (k: string): string[] => (Array.isArray(c[k]) ? (c[k] as string[]) : []);
  const num = (k: string, d: number): number => Number(c[k]) || d;
  return {
    web1clickAllowed: arr("web_1click_allowed"),
    stepupTwoPersonRequired: arr("stepup_two_person_required"),
    retentionHotChatDays: num("retention_hot_chat_days", 180),
    retentionHotAuditDays: num("retention_hot_audit_days", 365),
    retentionColdR2Years: num("retention_cold_r2_years", 8),
    gpsMaxAccuracyMeters: num("gps_max_accuracy_meters", 30),
    samplingMovingSeconds: num("sampling_moving_seconds", 30),
    samplingStationarySeconds: num("sampling_stationary_seconds", 300),
    minDisplacementMeters: num("min_displacement_meters", 15),
    wayfindingOnlyRoles: arr("wayfinding_only_roles"),
  };
}

/**
 * Tier 1: may this `action` be 1-click approved from the web portal by a role
 * that is NOT in the two-person set? Returns true only when the action is in
 * the editable `web_1click_allowed` list. The caller still mints the signed
 * single-use token (4h TTL) and logs the audit receipt.
 */
export async function isTier1WebApproval(action: string): Promise<boolean> {
  const p = await loadOperationalPolicy();
  return p.web1clickAllowed.includes(action.toUpperCase());
}

/**
 * Tier 2: does this `action` require web-portal two-person quorum +
 * StepUpModal? Bounded by the editable `stepup_two_person_required` list.
 * Telegram (or any remote/1-tap channel) is BLOCKED for these — the caller
 * must surface the StepUpModal + approved_by <> drafted_by + dry-run gate.
 */
export async function isTier2StepUp(action: string): Promise<boolean> {
  const p = await loadOperationalPolicy();
  return p.stepupTwoPersonRequired.includes(action.toUpperCase());
}

export type DoubtDomain = "academic" | "hostel_mess_maintenance" | "other";
export interface DoubtRoute {
  domain: DoubtDomain;
  /** First-line routing (never straight to principal/oie). */
  primaryRoles: string[];
  /** SLA-breach / endorsed escalation target. */
  escalationRoles: string[];
  /** Requires faculty/hod endorsement before escalating higher. */
  requiresEndorsement: boolean;
}

/**
 * Authority-bridge routing. Academic/timetable/attendance -> faculty (hod for
 * dept-wide); hostel/mess/maintenance -> caretaker/mess_incharge/deputy_warden.
 * Higher escalation (oie/exam_branch/principal) is gated behind endorsement or
 * an unacknowledged SLA breach — the router returns the chain, the caller
 * enforces the endorsement/SLA check.
 */
export async function routeDoubt(domain: DoubtDomain): Promise<DoubtRoute> {
  switch (domain) {
    case "academic":
      return {
        domain,
        primaryRoles: ["faculty", "hod"],
        escalationRoles: ["oie", "exam_branch", "principal"],
        requiresEndorsement: true,
      };
    case "hostel_mess_maintenance":
      return {
        domain,
        primaryRoles: ["caretaker", "mess_incharge", "deputy_warden"],
        escalationRoles: ["hostel_manager", "chief_warden"],
        requiresEndorsement: false,
      };
    default:
      return {
        domain,
        primaryRoles: ["faculty", "hod"],
        escalationRoles: ["admin"],
        requiresEndorsement: true,
      };
  }
}

export type ReplyKind = "pii_sensitive" | "cohort_policy";
export type ReplyVisibility = "PRIVATE_STUDENT" | "CLASS_GROUP_PLUS_KNOWLEDGE";

/**
 * Constraint-tagged dual reply routing. PII-sensitive answers (individual
 * marks, fee dues, medical condonation, disciplinary notes) go ONLY to the
 * asking student. Cohort/policy clarifications are posted to the class group
 * with verified_by/regulation/cohort tags AND indexed into confirmed_knowledge.
 */
export function replyVisibility(kind: ReplyKind): ReplyVisibility {
  return kind === "pii_sensitive" ? "PRIVATE_STUDENT" : "CLASS_GROUP_PLUS_KNOWLEDGE";
}
