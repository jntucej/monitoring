/**
 * Autonomous approval + routing service — the single source of truth for
 * "who can approve what, and where does a doubt goes". Everything is read
 * from the VERSIONED policy tables (migration 55), with a JSONB facility-row
 * fallback (migration 54) so a pre-migration DB still works:
 *
 *   - isTier1WebApproval(action) / isTier2StepUp(action)
 *       Channel + quorum now come from governance_matrix.action_key (the
 *       versioned, effective-dated source of truth). Falls back to the
 *       `web_1click_allowed` / `stepup_two_person_required` JSONB lists when
 *       no governance_matrix row exists for the action.
 *   - routeDoubt(category)
 *       Authority-bridge routing read from routing_policies (category ->
 *       stage_1_role + escalation_chain + allow_direct_bypass). Formal
 *       grievances (allow_direct_bypass = true) skip staging. Falls back to
 *       the static domain map when the table is empty.
 *   - replyVisibility(kind)
 *       PII-sensitive -> PRIVATE_STUDENT only; cohort/policy clarifications
 *       -> class group + confirmed_knowledge index.
 */

import { query } from "@/lib/postgres";

const POLICY_FACILITY = "CAMPUS_TELEMETRY_POLICY";

// ── Versioned policy tables (migration 55) ────────────────────────────────
export type PolicyStatus = "DRAFT" | "DRY_RUN_VERIFIED" | "ACTIVE" | "ARCHIVED";
export interface GovernanceRow {
  action_key: string;
  channel: "web_1click" | "web_single" | "step_up_quorum";
  required_approvers_count: number;
  eligible_roles: string[];
  require_dry_run: boolean;
  require_circular_attachment: boolean;
  status: PolicyStatus;
  version: number;
}
export interface RoutingRow {
  policy_key: string;
  category: string;
  stage_1_role: string;
  escalation_chain: string[];
  sla_timeout_hours: number;
  allow_direct_bypass: boolean;
  reply_visibility: "private_dm" | "group_chat" | "dual_constraint_tagged";
  auto_promote_to_kb: boolean;
  status: PolicyStatus;
  version: number;
}

/** The newest non-archived governance_matrix row for an action_key. */
export async function loadGovernance(actionKey: string): Promise<GovernanceRow | null> {
  const { rows } = await query<{
    action_key: string;
    channel: GovernanceRow["channel"];
    required_approvers_count: number;
    eligible_roles: string[];
    require_dry_run: boolean;
    require_circular_attachment: boolean;
    status: PolicyStatus;
    version: number;
  }>(
    `SELECT action_key, channel, required_approvers_count, eligible_roles,
            require_dry_run, require_circular_attachment, status, version
       FROM public.governance_matrix
      WHERE action_key = $1 AND status <> 'ARCHIVED'
      ORDER BY effective_from DESC, version DESC
      LIMIT 1`,
    [actionKey],
  ).catch(() => ({ rows: [] as never[] }));
  if (!rows[0]) return null;
  return {
    action_key: rows[0].action_key,
    channel: rows[0].channel,
    required_approvers_count: Number(rows[0].required_approvers_count),
    eligible_roles: Array.isArray(rows[0].eligible_roles) ? rows[0].eligible_roles : [],
    require_dry_run: !!rows[0].require_dry_run,
    require_circular_attachment: !!rows[0].require_circular_attachment,
    status: rows[0].status,
    version: Number(rows[0].version),
  };
}

/** The newest non-archived routing_policies row for a doubt category. */
export async function loadRoutingPolicy(category: string): Promise<RoutingRow | null> {
  const { rows } = await query<{
    policy_key: string;
    category: string;
    stage_1_role: string;
    escalation_chain: string[];
    sla_timeout_hours: number;
    allow_direct_bypass: boolean;
    reply_visibility: RoutingRow["reply_visibility"];
    auto_promote_to_kb: boolean;
    status: PolicyStatus;
    version: number;
  }>(
    `SELECT policy_key, category, stage_1_role, escalation_chain, sla_timeout_hours,
            allow_direct_bypass, reply_visibility, auto_promote_to_kb, status, version
       FROM public.routing_policies
      WHERE category = $1 AND status <> 'ARCHIVED'
      ORDER BY effective_from DESC, version DESC
      LIMIT 1`,
    [category],
  ).catch(() => ({ rows: [] as never[] }));
  if (!rows[0]) return null;
  return {
    policy_key: rows[0].policy_key,
    category: rows[0].category,
    stage_1_role: rows[0].stage_1_role,
    escalation_chain: Array.isArray(rows[0].escalation_chain) ? rows[0].escalation_chain : [],
    sla_timeout_hours: Number(rows[0].sla_timeout_hours),
    allow_direct_bypass: !!rows[0].allow_direct_bypass,
    reply_visibility: rows[0].reply_visibility,
    auto_promote_to_kb: !!rows[0].auto_promote_to_kb,
    status: rows[0].status,
    version: Number(rows[0].version),
  };
}

// ── JSONB fallback (migration 54) ─────────────────────────────────────────
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

/** Load the editable operational policy (one JSONB row) — fallback only. */
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
 * Tier 1: may this `action` be 1-click approved from the web portal? Reads the
 * versioned governance_matrix first (channel = web_1click / web_single); falls
 * back to the JSONB `web_1click_allowed` list when no row exists. The caller
 * still mints the signed single-use token (4h TTL) and logs the audit receipt.
 */
export async function isTier1WebApproval(action: string): Promise<boolean> {
  const key = action.toLowerCase();
  const gov = await loadGovernance(key);
  if (gov) return gov.channel === "web_1click" || gov.channel === "web_single";
  const p = await loadOperationalPolicy();
  return p.web1clickAllowed.includes(action.toUpperCase());
}

/**
 * Tier 2: does this `action` require web-portal two-person quorum +
 * StepUpModal? Reads governance_matrix (channel = step_up_quorum, OR
 * required_approvers_count >= 2, OR in the JSONB fallback list). Telegram /
 * any remote 1-tap channel is BLOCKED for these — the caller must surface the
 * StepUpModal + approved_by <> drafted_by + dry-run gate.
 */
export async function isTier2StepUp(action: string): Promise<boolean> {
  const key = action.toLowerCase();
  const gov = await loadGovernance(key);
  if (gov) return gov.channel === "step_up_quorum" || gov.required_approvers_count >= 2;
  const p = await loadOperationalPolicy();
  return p.stepupTwoPersonRequired.includes(action.toUpperCase());
}

export type DoubtDomain = "academic" | "hostel_mess_maintenance" | "exam" | "grievance" | "other";
export interface DoubtRoute {
  domain: DoubtDomain;
  /** First-line routing (never straight to principal/oie unless statutory). */
  primaryRoles: string[];
  /** SLA-breach / endorsed escalation target. */
  escalationRoles: string[];
  /** Statutory grievance channels may bypass staging. */
  allowDirectBypass: boolean;
  /** PII-sensitive -> PRIVATE_STUDENT; cohort -> CLASS_GROUP_PLUS_KNOWLEDGE. */
  replyVisibility: "PRIVATE_STUDENT" | "CLASS_GROUP_PLUS_KNOWLEDGE";
  /** Auto-promote the answered doubt into confirmed_knowledge. */
  autoPromoteToKb: boolean;
  /** Requires faculty/hod endorsement before escalating higher. */
  requiresEndorsement: boolean;
  /** Source of this routing decision (audit). */
  source: "routing_policies" | "static_fallback";
}

const STATIC_FALLBACK: Record<string, Omit<DoubtRoute, "source">> = {
  academic: {
    domain: "academic",
    primaryRoles: ["faculty", "hod"],
    escalationRoles: ["oie", "exam_branch", "principal"],
    allowDirectBypass: false,
    replyVisibility: "CLASS_GROUP_PLUS_KNOWLEDGE",
    autoPromoteToKb: true,
    requiresEndorsement: true,
  },
  hostel_mess_maintenance: {
    domain: "hostel_mess_maintenance",
    primaryRoles: ["caretaker", "mess_incharge", "deputy_warden"],
    escalationRoles: ["hostel_manager", "chief_warden"],
    allowDirectBypass: false,
    replyVisibility: "CLASS_GROUP_PLUS_KNOWLEDGE",
    autoPromoteToKb: true,
    requiresEndorsement: false,
  },
  exam: {
    domain: "exam",
    primaryRoles: ["faculty", "hod"],
    escalationRoles: ["exam_branch", "oie"],
    allowDirectBypass: false,
    replyVisibility: "PRIVATE_STUDENT",
    autoPromoteToKb: false,
    requiresEndorsement: true,
  },
  grievance: {
    domain: "grievance",
    primaryRoles: ["admin"],
    escalationRoles: ["principal"],
    allowDirectBypass: true,
    replyVisibility: "PRIVATE_STUDENT",
    autoPromoteToKb: false,
    requiresEndorsement: false,
  },
};

/**
 * Authority-bridge routing. Reads the versioned routing_policies table for the
 * category; falls back to the static domain map when the table is empty.
 * Formal grievances (allow_direct_bypass = true) skip staging.
 */
export async function routeDoubt(domain: DoubtDomain): Promise<DoubtRoute> {
  const category =
    domain === "hostel_mess_maintenance" ? "hostel" : domain === "other" ? "general" : domain;
  const row = await loadRoutingPolicy(category);
  if (row) {
    return {
      domain,
      primaryRoles: row.stage_1_role ? [row.stage_1_role] : [],
      escalationRoles: row.escalation_chain,
      allowDirectBypass: row.allow_direct_bypass,
      replyVisibility:
        row.reply_visibility === "private_dm" ? "PRIVATE_STUDENT" : "CLASS_GROUP_PLUS_KNOWLEDGE",
      autoPromoteToKb: row.auto_promote_to_kb,
      requiresEndorsement: !row.allow_direct_bypass,
      source: "routing_policies",
    };
  }
  const fb = STATIC_FALLBACK[domain] ?? STATIC_FALLBACK.other ?? STATIC_FALLBACK.academic;
  return { ...fb, source: "static_fallback" };
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
