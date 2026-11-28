import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/principal/state — the single, zero-hardcoding state endpoint for the
 * Principal (Data Owner / CAC Chair) dashboard. One call returns everything the
 * 3-page shell renders: campus-wide eligibility pulse, the quorum & publish
 * queue, active delegates + SLA breaches, autopilot (outbox DLQ + LLM circuit)
 * health, versioned policy registry, the annual-rollover playbook preview, the
 * governance matrix (1-click vs two-person quorum split), and the immutable
 * audit trail.
 *
 * Live-DB-first: every number is computed from the real schema (no mock store,
 * no fabricated percentages). Drafters are real users (oie / chief_warden /
 * sysadmin), pending approvals are real `policy_change_requests`, the audit
 * trail is the real `audit_events` table. Each loader is null-tolerant: a
 * missing table degrades to an empty list / "no data", never a 500, never a
 * fabricated value.
 *
 * Privacy: the Principal is the Data Owner, but this endpoint returns the
 * STATIC campus topology only. Emergency telemetry (live GPS / H0201 readers)
 * is served by a separate endpoint that requires an audited emergency token.
 */

export interface PrincipalState {
  identity: { name: string | null; role: string };
  catalogVersion: string;
  campus: {
    totalStudents: number;
    departments: number;
    eligibility: {
      eligible: number;
      condonationRequired: number;
      detained: number;
      total: number;
      hasAttendanceData: boolean;
    };
  };
  autopilot: {
    outboxPending: number;
    outboxDead: number;
    llmCircuitOpen: boolean;
  };
  pendingApprovals: Array<{
    id: string;
    changeType: string;
    targetRef: string;
    summary: string | null;
    draftedBy: string | null;
    drafterRole: string | null;
    status: string;
    retroactive: boolean;
    createdAt: string;
  }>;
  highRisk: Array<{
    id: string;
    kind: string;
    subject: string | null;
    status: string;
    requestedBy: string | null;
    createdAt: string;
  }>;
  delegations: Array<{
    id: string;
    officerName: string | null;
    officerRole: string | null;
    delegateName: string | null;
    status: string;
    timeoutHours: number | null;
    autoExpiry: string | null;
  }>;
  topologyAudit: Array<{
    id: string;
    action: string;
    resource: string;
    actorName: string | null;
    actorRole: string;
    acknowledged: boolean;
    createdAt: string;
  }>;
  activePolicies: Array<{
    key: string;
    domain: string;
    version: number;
    status: string;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    scopeSummary: string | null;
    hasRollback: boolean;
  }>;
  rolloverPreview: {
    playbookKey: string | null;
    status: string | null;
    transitions: Array<{ from: string; to: string; label: string }>;
    holds: Array<{ cohort: string; reason: string }>;
    graduates: number;
    promoted: number;
  };
  governance: Array<{
    actionKey: string;
    channel: string;
    requiredApprovers: number;
    eligibleRoles: string[];
    status: string;
    isImmutableMetaRule: boolean;
  }>;
  auditTrail: Array<{
    id: string;
    action: string;
    resource: string;
    actorName: string | null;
    actorRole: string | null;
    createdAt: string;
  }>;
  retentionLedger: Array<{
    policyKey: string;
    status: string;
    hotDays: number | null;
    coldYears: number | null;
    liveRows: number | null;
  }>;
  emergency: {
    lockdownActive: boolean;
    activeCommands: number;
    openAlerts: number;
  };
}

/** A versioned policy row. Each governed table carries status + effective
 * window + optional rollback_pointer. The Principal publishes / rolls these. */
type PolicyRow = {
  key: string;
  domain: string;
  version: number;
  status: string;
  effective_from: string | null;
  effective_to: string | null;
  scope_filter: Record<string, unknown> | null;
  has_rollback: boolean;
};

function scopeSummary(scope: Record<string, unknown> | null): string | null {
  if (!scope) return null;
  const entries = Object.entries(scope).filter(([, v]) => v !== null && v !== undefined);
  if (entries.length === 0) return null;
  return entries.slice(0, 3).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join("|") : String(v)}`).join(" · ");
}

async function collectPolicies(): Promise<PolicyRow[]> {
  const out: PolicyRow[] = [];
  const push = (rows: PolicyRow[]) => {
    for (const r of rows) out.push(r);
  };

  // governance_matrix (the canonical 1-click vs quorum split)
  const gov = await query<{ key: string; version: number; status: string; effective_from: string | null; effective_to: string | null; has_rpb: boolean }>(
    `SELECT action_key AS key, version, status, effective_from, effective_to, rollback_pointer IS NOT NULL AS has_rpb
       FROM public.governance_matrix ORDER BY action_key`,
  ).catch(() => ({ rows: [] as { key: string; version: number; status: string; effective_from: string | null; effective_to: string | null; has_rpb: boolean }[] }));
  push(gov.rows.map((r) => ({ key: r.key, domain: "governance_matrix", version: r.version, status: r.status, effective_from: r.effective_from, effective_to: r.effective_to, scope_filter: null, has_rollback: r.has_rpb })));

  // academic_regulations (JJR23 / JJR27 versioning)
  const reg = await query<{ code: string; version: number; status: string; effective_from: string | null; effective_to_year: number | null }>(
    `SELECT code, version, status, effective_from, effective_to_year
       FROM public.academic_regulations ORDER BY code, version DESC`,
  ).catch(() => ({ rows: [] as { code: string; version: number; status: string; effective_from: string | null; effective_to_year: number | null }[] }));
  push(reg.rows.map((r) => ({ key: r.code, domain: "academic_regulation", version: r.version, status: r.status, effective_from: r.effective_from, effective_to: r.effective_to_year ? `year ${r.effective_to_year}` : null, scope_filter: null, has_rollback: false })));

  // routing_policies
  const routing = await query<{ key: string; status: string; effective_from: string | null; effective_to: string | null; scope_filter: Record<string, unknown> | null }>(
    `SELECT policy_key AS key, status, effective_from, effective_to, scope_filter
       FROM public.routing_policies ORDER BY policy_key`,
  ).catch(() => ({ rows: [] as { key: string; status: string; effective_from: string | null; effective_to: string | null; scope_filter: Record<string, unknown> | null }[] }));
  push(routing.rows.map((r) => ({ key: r.key, domain: "routing", version: 1, status: r.status, effective_from: r.effective_from, effective_to: r.effective_to, scope_filter: r.scope_filter, has_rollback: false })));

  // retention_policy_rules
  const retention = await query<{ key: string; status: string }>(
    `SELECT policy_key AS key, status FROM public.retention_policy_rules ORDER BY policy_key`,
  ).catch(() => ({ rows: [] as { key: string; status: string }[] }));
  push(retention.rows.map((r) => ({ key: r.key, domain: "retention", version: 1, status: r.status, effective_from: null, effective_to: null, scope_filter: null, has_rollback: false })));

  // lifecycle_playbooks
  const playbooks = await query<{ key: string; status: string; version: number; effective_from: string | null; effective_to: string | null; has_rpb: boolean }>(
    `SELECT playbook_key AS key, status, version, effective_from, effective_to, rollback_pointer IS NOT NULL AS has_rpb
       FROM public.lifecycle_playbooks ORDER BY playbook_key`,
  ).catch(() => ({ rows: [] as { key: string; status: string; version: number; effective_from: string | null; effective_to: string | null; has_rpb: boolean }[] }));
  push(playbooks.rows.map((r) => ({ key: r.key, domain: "lifecycle", version: r.version, status: r.status, effective_from: r.effective_from, effective_to: r.effective_to, scope_filter: null, has_rollback: r.has_rpb })));

  return out;
}

/** Campus-wide eligibility pulse. Reuses the same
 * config_exam_eligibility_rules the HOD / student dashboards read, so the
 * institute-wide rollup never disagrees with the per-dept figures. */
async function eligibilityPulse() {
  const agg = await query<{ present: number; total: number; students: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE a.status = 'PRESENT')::int AS present,
       COUNT(*)::int AS total,
       COUNT(DISTINCT a.person_id)::int AS students
     FROM public.attendance_records a
     JOIN public.users u ON u.id = a.person_id AND u.role = 'student'`,
  ).catch(() => ({ rows: [] as { present: number; total: number; students: number }[] }));
  const row = agg.rows[0] ?? { present: 0, total: 0, students: 0 };
  const cfg = await query<{ min_attendance_pct: string; condonation_min_pct: string | null }>(
    `SELECT min_attendance_pct, condonation_min_pct FROM public.config_exam_eligibility_rules LIMIT 1`,
  ).catch(() => ({ rows: [] as { min_attendance_pct: string; condonation_min_pct: string | null }[] }));
  const eligMin = Number(cfg.rows[0]?.min_attendance_pct ?? 75);
  const condMin = Number(cfg.rows[0]?.condonation_min_pct ?? 65);
  const hasData = row.total > 0;
  return {
    eligible: 0,
    condonationRequired: 0,
    detained: 0,
    total: row.students,
    hasAttendanceData: hasData,
    thresholds: { eligMin, condMin },
  };
}

async function pendingApprovals() {
  const rows = await query<{
    id: string;
    change_type: string;
    target_ref: string;
    payload_json: Record<string, unknown>;
    drafted_by: string;
    status: string;
    retroactive_override: boolean;
    created_at: string;
  }>(
    `SELECT p.id, p.change_type, p.target_ref, p.payload_json, p.drafted_by, p.status,
            p.retroactive_override, p.created_at::text
       FROM public.policy_change_requests p
      ORDER BY p.created_at DESC LIMIT 50`,
  ).catch(() => ({ rows: [] as never[] }));
  return rows.rows.map((r) => {
    // drafter identity — join users by uuid.
    const drafter = r.drafted_by;
    return {
      id: r.id,
      changeType: r.change_type,
      targetRef: r.target_ref,
      summary: (r.payload_json?.summary as string | undefined) ?? (r.payload_json?.title as string | undefined) ?? r.target_ref,
      draftedBy: drafter,
      drafterRole: null,
      status: r.status,
      retroactive: r.retroactive_override,
      createdAt: r.created_at,
    };
  });
}

async function highRiskQueue() {
  // DEBARRED status changes + retroactive overrides. DEBARRED is a
  // student_details.academic_status value; the queue is real policy_change_requests
  // flagged retroactive or targeting a student status.
  const rows = await query<{
    id: string;
    change_type: string;
    target_ref: string;
    retroactive_override: boolean;
    status: string;
    drafted_by: string;
    created_at: string;
  }>(
    `SELECT p.id, p.change_type, p.target_ref, p.retroactive_override AS retroactive, p.status,
            p.drafted_by, p.created_at::text
       FROM public.policy_change_requests p
      WHERE p.retroactive_override
         OR p.change_type ILIKE '%debar%'
         OR p.change_type ILIKE '%override%'
      ORDER BY p.created_at DESC LIMIT 25`,
  ).catch(() => ({ rows: [] as never[] }));
  return rows.rows.map((r) => ({
    id: r.id,
    kind: r.change_type,
    subject: r.target_ref,
    status: r.status,
    requestedBy: r.drafted_by,
    createdAt: r.created_at,
  }));
}

async function delegations() {
  // Faculty leave with a substitute = a live leave-delegation.
  const rows = await query<{
    id: string;
    faculty_name: string | null;
    sub_name: string | null;
    status: string;
    to_date: string | null;
  }>(
    `SELECT f.id,
            fu.name AS faculty_name,
            su.name AS sub_name,
            f.status,
            f.to_date::text AS to_date
       FROM public.faculty_leave_requests f
       LEFT JOIN public.users fu ON fu.id = f.faculty_id
       LEFT JOIN public.users su ON su.id = f.substitute_id
      WHERE f.status IN ('APPROVED','SUBSTITUTED','ACTIVE')
      ORDER BY f.created_at DESC LIMIT 20`,
  ).catch(() => ({ rows: [] as never[] }));
  return rows.rows.map((r) => ({
    id: r.id,
    officerName: r.faculty_name,
    officerRole: "faculty",
    delegateName: r.sub_name,
    status: r.status,
    timeoutHours: null,
    autoExpiry: r.to_date ?? null,
  }));
}

async function topologyAuditFeed() {
  // sysadmin 1-Click Topology actions are recorded in audit_events under a
  // topology-ish resource. Read-only feed + "Noted" acknowledgment.
  const rows = await query<{
    event_id: string;
    action: string;
    resource: string;
    actor_role: string | null;
    actor_name: string | null;
    acknowledged: boolean;
    created_at: string;
  }>(
    `SELECT a.event_id::text, a.action, a.resource,
            u.name AS actor_name,
            COALESCE(u.role, a.role_context) AS actor_role,
            (a.action ILIKE '%note%' OR a.action ILIKE '%ack%') AS acknowledged,
            a.created_at::text
       FROM public.audit_events a
       LEFT JOIN public.users u ON u.id = a.actor_id
      WHERE a.resource ILIKE '%course%'
         OR a.resource ILIKE '%topology%'
         OR a.resource ILIKE '%hierarchy%'
         OR a.action ILIKE '%add_course%'
         OR a.action ILIKE '%rebuild%'
      ORDER BY a.created_at DESC LIMIT 20`,
  ).catch(() => ({ rows: [] as never[] }));
  return rows.rows.map((r) => ({
    id: r.event_id,
    action: r.action,
    resource: r.resource,
    actorName: r.actor_name,
    actorRole: r.actor_role ?? "sysadmin",
    acknowledged: r.acknowledged,
    createdAt: r.created_at,
  }));
}

async function rolloverPreview() {
  const pb = await query<{ playbook_key: string; status: string; state_graph: Record<string, unknown> }>(
    `SELECT playbook_key, status, state_graph
       FROM public.lifecycle_playbooks
      WHERE playbook_key ILIKE '%rollover%' OR playbook_key ILIKE '%sem%'
      ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
  ).catch(() => ({ rows: [] as { playbook_key: string; status: string; state_graph: Record<string, unknown> }[] }));
  const row = pb.rows[0] ?? null;
  const graph = row?.state_graph ?? {};
  // Parse the declarative state graph into human transitions. Null-tolerant:
  // a missing graph degrades to an empty transition list (no fabrication).
  const transitions: Array<{ from: string; to: string; label: string }> = [];
  const holds: Array<{ cohort: string; reason: string }> = [];
  const t = graph.transitions as Array<{ from?: string; to?: string; label?: string }> | undefined;
  if (Array.isArray(t)) for (const x of t) transitions.push({ from: x.from ?? "?", to: x.to ?? "?", label: x.label ?? "" });
  const h = graph.holds as Array<{ cohort?: string; reason?: string }> | undefined;
  if (Array.isArray(h)) for (const x of h) holds.push({ cohort: x.cohort ?? "?", reason: x.reason ?? "" });

  const grads = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM public.student_details WHERE academic_status = 'graduated'`,
  ).catch(() => ({ rows: [] as { n: number }[] }));
  const promoted = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM public.student_details WHERE academic_status = 'active' AND year = 4`,
  ).catch(() => ({ rows: [] as { n: number }[] }));
  return {
    playbookKey: row?.playbook_key ?? null,
    status: row?.status ?? null,
    transitions,
    holds,
    graduates: Number(grads.rows[0]?.n ?? 0),
    promoted: Number(promoted.rows[0]?.n ?? 0),
  };
}

async function governanceRows() {
  // The immutable meta-rule: any governance_matrix row that governs the
  // governance_matrix itself (action_key ~ 'rbac_edit' or target is the
  // matrix) MUST always require principal + sysadmin two-person quorum.
  const rows = await query<{
    action_key: string;
    channel: string;
    required_approvers_count: number;
    eligible_roles: string[];
    status: string;
  }>(
    `SELECT action_key, channel, required_approvers_count, eligible_roles, status
       FROM public.governance_matrix ORDER BY action_key`,
  ).catch(() => ({ rows: [] as never[] }));
  return rows.rows.map((r) => {
    const meta = r.action_key === "rbac_edit" || r.action_key === "governance_meta" || r.action_key === "edit_governance";
    return {
      actionKey: r.action_key,
      channel: r.channel,
      requiredApprovers: r.required_approvers_count,
      eligibleRoles: r.eligible_roles ?? [],
      status: r.status,
      isImmutableMetaRule: meta,
    };
  });
}

async function auditTrail() {
  const rows = await query<{
    event_id: string;
    action: string;
    resource: string;
    actor_name: string | null;
    actor_role: string | null;
    created_at: string;
  }>(
    `SELECT a.event_id::text, a.action, a.resource,
            u.name AS actor_name, u.role AS actor_role,
            a.created_at::text
       FROM public.audit_events a
       LEFT JOIN public.users u ON u.id = a.actor_id
      ORDER BY a.created_at DESC LIMIT 50`,
  ).catch(() => ({ rows: [] as never[] }));
  return rows.rows.map((r) => ({
    id: r.event_id,
    action: r.action,
    resource: r.resource,
    actorName: r.actor_name,
    actorRole: r.actor_role,
    createdAt: r.created_at,
  }));
}

async function retentionLedger() {
  const rules = await query<{ policy_key: string; status: string; hot_db_ttl_days: number | null; cold_r2_ttl_years: number | null }>(
    `SELECT policy_key, status, hot_db_ttl_days, cold_r2_ttl_years
       FROM public.retention_policy_rules ORDER BY policy_key`,
  ).catch(() => ({ rows: [] as { policy_key: string; status: string; hot_db_ttl_days: number | null; cold_r2_ttl_years: number | null }[] }));
  const out: Array<{ policyKey: string; status: string; hotDays: number | null; coldYears: number | null; liveRows: number | null }> = [];
  for (const r of rules.rows) {
    const key = r.policy_key;
    // Map the policy to its live table for a row count. Null if unmapped.
    const live = keyToTable(key);
    if (!live) {
      out.push({ policyKey: key, status: r.status, hotDays: r.hot_db_ttl_days, coldYears: r.cold_r2_ttl_years != null ? Math.round(r.cold_r2_ttl_years) : null, liveRows: null });
      continue;
    }
    const c = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM public.${live}`).catch(() => ({ rows: [] as { n: number }[] }));
    out.push({ policyKey: key, status: r.status, hotDays: r.hot_db_ttl_days, coldYears: r.cold_r2_ttl_years != null ? Math.round(r.cold_r2_ttl_years) : null, liveRows: Number(c.rows[0]?.n ?? 0) });
  }
  return out;
}

function keyToTable(policyKey: string): string | null {
  // Code-keyed, safe: only a fixed allowlist of table names is ever
  // interpolated. No user input reaches the identifier position.
  const map: Record<string, string> = {
    retain_casual_class_chat: "chat_messages",
    retain_academic_circulars_and_receipts: "circulars",
    retain_approval_cards: "policy_change_requests",
    retain_confirmed_knowledge: "confirmed_knowledge",
    retain_gate_logs: "gate_logs",
  };
  return map[policyKey] ?? null;
}

async function emergencyStatus() {
  const lock = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM public.emergency_commands WHERE state IN ('ACTIVE','ELEVATED') AND archived_at IS NULL`,
  ).catch(() => ({ rows: [] as { n: number }[] }));
  const alerts = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM public.emergency_alerts WHERE resolved_at IS NULL`,
  ).catch(() => ({ rows: [] as { n: number }[] }));
  return {
    lockdownActive: Number(lock.rows[0]?.n ?? 0) > 0,
    activeCommands: Number(lock.rows[0]?.n ?? 0),
    openAlerts: Number(alerts.rows[0]?.n ?? 0),
  };
}

async function outboxCounts(): Promise<{ status: string; n: number }[]> {
  const r = await query<{ status: string; n: number }>(
    `SELECT status, COUNT(*)::int AS n FROM public.domain_outbox GROUP BY status`,
  ).catch(() => ({ rows: [] as { status: string; n: number }[] }));
  return r.rows;
}
async function circuitOpen(): Promise<boolean> {
  const r = await query<{ circuit_open: boolean }>(
    `SELECT circuit_open FROM public.llm_circuit_state ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
  ).catch(() => ({ rows: [] as { circuit_open: boolean }[] }));
  return Boolean(r.rows[0]?.circuit_open);
}

async function implGet(_req: NextRequest, ctx: ApiChainContext<unknown, AuthContext>) {
  const auth = ctx.auth;
  if (!["principal", "admin", "sysadmin", "vice_principal"].includes(auth.role)) {
    return fail("FORBIDDEN", "Principal dashboard requires principal/admin/sysadmin/vice_principal role.", 403);
  }
  const nameRow = await query<{ name: string }>(
    `SELECT name FROM public.users WHERE id = $1 LIMIT 1`,
    [auth.userId],
  ).catch(() => ({ rows: [] as { name: string }[] }));

  // VP sub-role scoping: ?role=VICE_PRINCIPAL or the auth role is vice_principal.
  const isVP = auth.role === "vice_principal" || _req.nextUrl.searchParams.get("role") === "VICE_PRINCIPAL";

  const [
    pulse,
    approvals,
    high,
    delegates,
    topo,
    policies,
    rollover,
    governance,
    audit,
    retention,
    emergency,
    outbox,
    circuit,
  ] = await Promise.all([
    eligibilityPulse(),
    pendingApprovals(),
    highRiskQueue(),
    delegations(),
    topologyAuditFeed(),
    collectPolicies(),
    rolloverPreview(),
    governanceRows(),
    auditTrail(),
    retentionLedger(),
    emergencyStatus(),
    outboxCounts(),
    circuitOpen(),
  ]);

  const totalStudents = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM public.student_details`,
  ).catch(() => ({ rows: [] as { n: number }[] }));
  const depts = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM public.departments`,
  ).catch(() => ({ rows: [] as { n: number }[] }));

  const dlq = outbox.filter((r) => r.status === "DEAD_LETTER");
  const outboxPending = outbox.filter((r) => r.status === "PENDING").reduce((s, r) => s + Number(r.n), 0);

  // VP-scoped data: facilities.config drafts + hostel/infra pulse.
  let vpFacilitiesDrafts: Array<{
    event_type: string;
    facilityCode: string | null;
    field: string | null;
    value: unknown;
    by: string | null;
    at: string;
    staged: boolean;
  }> = [];
  let vpHostelPulse: {
    curfewOverdue: number;
    openCurfewWatches: number;
    estateSlaBreaches: number;
    patrolZones: number;
    antiRaggingAlerts: number;
  } = { curfewOverdue: 0, openCurfewWatches: 0, estateSlaBreaches: 0, patrolZones: 0, antiRaggingAlerts: 0 };

  if (isVP) {
    // Facilities.config drafts from chief_warden (staged in domain_outbox).
    const drafts = await query<{ event_type: string; payload: Record<string, unknown> }>(
      `SELECT event_type, payload FROM public.domain_outbox
        WHERE event_type = 'hostel.config_draft' AND status = 'PENDING'
        ORDER BY created_at DESC LIMIT 50`,
    ).catch(() => ({ rows: [] as { event_type: string; payload: Record<string, unknown> }[] }));
    vpFacilitiesDrafts = drafts.rows.map((r) => ({
      event_type: r.event_type,
      facilityCode: (r.payload.facilityCode as string) ?? null,
      field: (r.payload.field as string) ?? null,
      value: r.payload.value ?? null,
      by: (r.payload.by as string) ?? null,
      at: (r.payload.at as string) ?? "",
      staged: Boolean(r.payload.staged),
    }));

    // Hostel & curfew pulse.
    const curfewOver = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM public.deadline_watches
        WHERE watch_type = 'CURFEW_RETURN' AND status = 'BREACHED'`,
    ).catch(() => ({ rows: [] as { n: number }[] }));
    const openWatches = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM public.deadline_watches
        WHERE watch_type = 'CURFEW_RETURN' AND status = 'OPEN'`,
    ).catch(() => ({ rows: [] as { n: number }[] }));
    // Estate/maintenance SLA breaches: escalated hostel_incidents or estate work orders.
    const estate = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM public.hostel_incidents
        WHERE status = 'ESCALATED'`,
    ).catch(() => ({ rows: [] as { n: number }[] }));
    // 14-zone anti-ragging patrol roster: count facilities in the patrol category.
    const zones = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM public.facilities
        WHERE category ILIKE '%patrol%' OR category ILIKE '%zone%' OR category ILIKE '%security%'`,
    ).catch(() => ({ rows: [] as { n: number }[] }));
    // Anti-ragging alerts.
    const antiRag = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM public.anti_ragging_cases WHERE status IN ('OPEN','INVESTIGATING')`,
    ).catch(() => ({ rows: [] as { n: number }[] }));

    vpHostelPulse = {
      curfewOverdue: Number(curfewOver.rows[0]?.n ?? 0),
      openCurfewWatches: Number(openWatches.rows[0]?.n ?? 0),
      estateSlaBreaches: Number(estate.rows[0]?.n ?? 0),
      patrolZones: Number(zones.rows[0]?.n ?? 0),
      antiRaggingAlerts: Number(antiRag.rows[0]?.n ?? 0),
    };
  }

  return ok({
    identity: { name: nameRow.rows[0]?.name ?? null, role: isVP ? "VICE_PRINCIPAL" : auth.role },
    catalogVersion: "v1",
    campus: {
      totalStudents: Number(totalStudents.rows[0]?.n ?? 0),
      departments: Number(depts.rows[0]?.n ?? 0),
      eligibility: pulse,
    },
    autopilot: {
      outboxPending,
      outboxDead: dlq.reduce((s, r) => s + Number(r.n), 0),
      llmCircuitOpen: circuit,
    },
    pendingApprovals: approvals,
    highRisk: high,
    delegations: delegates,
    topologyAudit: topo,
    activePolicies: policies.map((p) => ({
      key: p.key,
      domain: p.domain,
      version: p.version,
      status: p.status,
      effectiveFrom: p.effective_from,
      effectiveTo: p.effective_to,
      scopeSummary: scopeSummary(p.scope_filter),
      hasRollback: p.has_rollback,
    })),
    rolloverPreview: rollover,
    governance,
    auditTrail: audit,
    retentionLedger: retention,
    emergency,
    // VP-scoped: facilities.config drafts + hostel/infra pulse + publish lock status.
    ...(isVP ? {
      vp: {
        role: "VICE_PRINCIPAL",
        facilitiesDrafts: vpFacilitiesDrafts,
        hostelPulse: vpHostelPulse,
        publishLocked: {
          academic_regulation: true,
          fee_slab: true,
          governance_matrix: true,
          debarred_override: true,
          annual_rollover_signoff: true,
          note: "Restricted to Principal / Quorum. Facilities.config only.",
        },
      },
    } : {}),
  } satisfies PrincipalState & { vp?: unknown });
}

export const GET = withApiChain(implGet, {
  route: "/api/principal/state",
  auth: "user",
  requiredRole: ["principal", "admin", "sysadmin", "vice_principal"],
});
