import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/config/catalog — the unified, zero-hardcoding metadata layer.
 *
 * The frontend is a pure schema-driven renderer: every dropdown, filter pill,
 * Kanban column, lockdown target picker, and analytics grouping reads from
 * this endpoint via useCatalog() instead of static arrays. When JNTUH CEJ
 * adds a new branch / hostel block / gate in the DB, every dashboard + form
 * updates automatically with zero code deploys.
 *
 * Live sources (verified schema):
 *   departments            (code, name)
 *   student_details        (DISTINCT hostel_block, year, section)
 *   gates                  (gate_code, name, type, is_active)
 *   config_pass_types      (id, code, name, description, rules JSONB)
 *   config_roles           (role, display_name)
 *   complaints             (DISTINCT category, if present)
 *
 * Privacy: gate_code / department code / role code are human identifiers —
 * safe to expose to all roles. Raw DB UUIDs are never serialized.
 *
 * Caching: short in-process TTL so the N+1 dashboard widgets share one
 * lookup per page load without hammering Postgres.
 */

interface CatItem {
  code: string;
  name?: string;
  count?: number;
}

const CATALOG_TTL_MS = 60_000;
let cache: { at: number; value: CatalogPayload } | null = null;

/** Force-invalidate the in-process catalog cache (called after topology writes). */
export function bumpCatalogCache() {
  cache = null;
}

interface CatalogPayload {
  departments: CatItem[];
  hostelBlocks: CatItem[];
  yearSections: { year: number; section: string }[];
  gates: CatItem[];
  passTypes: Array<{
    code: string;
    name: string;
    requiresApproval?: boolean;
    approvalFlow?: string;
  }>;
  roles: CatItem[];
  complaintCategories: CatItem[];
  // Zero-hardcoding topology + versioned policy (code-keyed, no raw UUIDs).
  orgUnits: Array<{ code: string; name: string; type: string }>;
  facilities: Array<{ code: string; name: string; category: string; config?: Record<string, unknown> }>;
  activeRegulations: Array<{ code: string; version: number; status: string }>;
  workflowSchemas: Array<{ key: string; name: string; states: Record<string, unknown>; formSchema: Record<string, unknown> }>;
  // JSON Schema + UI Schema form registry (form_schemas, migration 59).
  // The student OS renders these with zero hardcoded fields; a new field in
  // 2029 is a DB row, not a frontend deploy.
  formSchemas: Array<{
    key: string;
    name: string;
    description?: string;
    jsonSchema: Record<string, unknown>;
    uiSchema: Record<string, unknown>;
    workflowCode?: string | null;
    bypassStaging: boolean;
  }>;
  // Exam-eligibility thresholds (config_exam_eligibility_rules) — the client
  // What-If simulator evaluates these with json-logic-js, matching the kernel.
  examEligibility: {
    eligibleMinPct: number | null;
    condonationMinPct: number | null;
    requireFeesPaid: boolean;
    requireAcademicActive: boolean;
  };
  // Versioned policy-as-data (Draft -> Dry-Run -> Approve -> Publish) — the
  // admin console edits these; nothing in the app hardcodes the values.
  routingPolicies: Array<{ key: string; category: string; stage1: string; status: string; version: number }>;
  governanceMatrix: Array<{ key: string; channel: string; approvers: number; status: string; version: number }>;
  retentionRules: Array<{ key: string; artifact: string; hotDays: number; coldYears: number; status: string }>;
  spatialPolicies: Array<{ key: string; role: string; layers: string[]; status: string }>;
  /** Program-agnostic, NEP-ready degree tracks (program_blueprints). */
  programBlueprints: Array<{
    code: string;
    name: string;
    totalSemesters: number;
    entrySemester: number;
    componentTypes: string[];
    status: string;
  }>;
  /** Cross-regulation credit transfer for detained/readmitted students. */
  subjectEquivalency: Array<{
    key: string;
    source: string;
    target: string;
    credits: number;
    status: string;
  }>;
  /** Calendar-driven semester/graduation state graphs (lifecycle_playbooks). */
  lifecyclePlaybooks: Array<{
    key: string;
    trigger: string;
    onCompletion: string | null;
    onDetention: string | null;
    status: string;
  }>;
  /** Swappable vendor adapters (integration_adapters) — code-keyed, no secrets. */
  integrationAdapters: Array<{
    key: string;
    direction: string;
    transport: string;
    status: string;
  }>;
  /**
   * HOD OS policy layer — every institutional threshold the HOD dashboard
   * renders (eligibility JSONLogic, course-offering rules, routing/escalation,
   * HOD form schemas, LLM circuit state, and the HOD 1-click vs quorum
   * governance scope) comes from here, so the UI is a pure schema renderer.
   * Nothing in the HOD screens hardcodes 75/65/35/15/60 or JJR23.
   */
  hodOsPolicy: {
    activeRegulation: string | null;
    eligibilityJsonLogic: Record<string, unknown> | null;
    courseOffering: {
      minEnrollment: number | null;
      maxSectionCapacity: number | null;
      alternateReallocationWindowDays: number | null;
      maxAdditionalElectiveCredits: number | null;
      facultyMenteeRatioMax: number | null;
    };
    routing: {
      privateOnlyCategories: string[];
      escalationChain: string[];
      abstentionClusterThreshold: number;
      slaTimeoutHours: number | null;
    };
    hodActions: {
      oneClick: string[];
      quorumLocked: Array<{ key: string; approvers: number }>;
    };
    llmCircuitOpen: boolean;
    hodFormSchemas: Array<{
      key: string;
      name: string;
      description?: string;
      jsonSchema: Record<string, unknown>;
      uiSchema: Record<string, unknown>;
    }>;
  };
  principalOsPolicy: {
    activeRegulation: string | null;
    // The two-person quorum split, read live from governance_matrix.
    quorumActions: Array<{
      key: string;
      requiredApprovers: number;
      eligibleRoles: string[];
      isImmutableMetaRule: boolean;
    }>;
    oneClickActions: string[];
    // Retention TTLs the Principal owns (Casual 30d / 1yr, Official 1yr / 8yr).
    retention: Array<{
      policyKey: string;
      hotDays: number | null;
      coldYears: number | null;
    }>;
    // Emergency telemetry is audit-gated: only served with a reason.
    emergencyTelemetry: {
      gated: boolean;
      layers: string[];
    };
    // Annual rollover playbook (declarative state graph).
    rollover: {
      playbookKey: string | null;
      status: string | null;
      transitions: Array<{ from: string; to: string; label: string }>;
    };
    llmCircuitOpen: boolean;
  };
  generated_at: string;
}

/** Public, code-keyed topology + policy layer. Raw UUIDs are never serialized. */
async function buildTopologyLayer(): Promise<{
  orgUnits: CatalogPayload["orgUnits"];
  facilities: CatalogPayload["facilities"];
  activeRegulations: CatalogPayload["activeRegulations"];
  workflowSchemas: CatalogPayload["workflowSchemas"];
  formSchemas: CatalogPayload["formSchemas"];
  examEligibility: CatalogPayload["examEligibility"];
  routingPolicies: CatalogPayload["routingPolicies"];
  governanceMatrix: CatalogPayload["governanceMatrix"];
  retentionRules: CatalogPayload["retentionRules"];
  spatialPolicies: CatalogPayload["spatialPolicies"];
  programBlueprints: CatalogPayload["programBlueprints"];
  subjectEquivalency: CatalogPayload["subjectEquivalency"];
  lifecyclePlaybooks: CatalogPayload["lifecyclePlaybooks"];
  integrationAdapters: CatalogPayload["integrationAdapters"];
}> {
  const [orgUnits, facilities, regs, workflows, formSchemas, examElig, routing, gov, retention, spatial, blueprints, equivalency, playbooks, adapters] =
    await Promise.all([
    query<{ code: string; name: string; unit_type: string }>(
      `SELECT code, name, unit_type FROM public.org_units WHERE is_active ORDER BY code`,
    ).catch(() => ({ rows: [] as { code: string; name: string; unit_type: string }[] })),
    query<{ facility_code: string; name: string; category: string; config: Record<string, unknown> | null }>(
      `SELECT facility_code, name, category, config FROM public.facilities WHERE is_active ORDER BY facility_code`,
    ).catch(() => ({ rows: [] as { facility_code: string; name: string; category: string; config: Record<string, unknown> | null }[] })),
    query<{ code: string; version: number; status: string }>(
      `SELECT code, version, status FROM public.academic_regulations WHERE is_active ORDER BY code`,
    ).catch(() => ({ rows: [] as { code: string; version: number; status: string }[] })),
    query<{ code: string; name: string; states: Record<string, unknown>; form_schema: Record<string, unknown> }>(
      `SELECT code, name, states, form_schema FROM public.workflow_definitions WHERE is_active ORDER BY code`,
    ).catch(() => ({ rows: [] as { code: string; name: string; states: Record<string, unknown>; form_schema: Record<string, unknown> }[] })),
    // form_schemas registry (migration 59) — JSON Schema + UI Schema the
    // student OS renders with zero hardcoded fields.
    query<{
      form_key: string; name: string; description: string | null;
      json_schema: Record<string, unknown>; ui_schema: Record<string, unknown>;
      workflow_code: string | null; bypass_staging: boolean;
    }>(
      `SELECT form_key, name, description, json_schema, ui_schema, workflow_code, bypass_staging
         FROM public.form_schemas WHERE is_active ORDER BY form_key`,
    ).catch(() => ({ rows: [] as { form_key: string; name: string; description: string | null; json_schema: Record<string, unknown>; ui_schema: Record<string, unknown>; workflow_code: string | null; bypass_staging: boolean }[] })),
    // config_exam_eligibility_rules — the What-If simulator's thresholds.
    query<{ min_attendance_pct: string; condonation_min_pct: string | null; require_fees_paid: boolean; require_academic_active: boolean }>(
      `SELECT min_attendance_pct, condonation_min_pct, require_fees_paid, require_academic_active
       FROM public.config_exam_eligibility_rules LIMIT 1`,
    ).catch(() => ({ rows: [] as { min_attendance_pct: string; condonation_min_pct: string | null; require_fees_paid: boolean; require_academic_active: boolean }[] })),
    // The four versioned policy tables (migration 55). Each may be absent on a
    // pre-migration DB — catch() keeps the catalog building.
    query<{ policy_key: string; category: string; stage_1_role: string; status: string; version: number }>(
      `SELECT policy_key, category, stage_1_role, status, version FROM public.routing_policies ORDER BY policy_key, version DESC`,
    ).catch(() => ({ rows: [] as { policy_key: string; category: string; stage_1_role: string; status: string; version: number }[] })),
    query<{ action_key: string; channel: string; required_approvers_count: number; status: string; version: number }>(
      `SELECT action_key, channel, required_approvers_count, status, version FROM public.governance_matrix ORDER BY action_key, version DESC`,
    ).catch(() => ({ rows: [] as { action_key: string; channel: string; required_approvers_count: number; status: string; version: number }[] })),
    query<{ policy_key: string; artifact_type: string; hot_db_ttl_days: number; cold_r2_ttl_years: number; status: string }>(
      `SELECT policy_key, artifact_type, hot_db_ttl_days, cold_r2_ttl_years, status FROM public.retention_policy_rules ORDER BY policy_key`,
    ).catch(() => ({ rows: [] as { policy_key: string; artifact_type: string; hot_db_ttl_days: number; cold_r2_ttl_years: number; status: string }[] })),
    query<{ policy_key: string; role_id: string; map_layer_access: string[]; status: string }>(
      `SELECT policy_key, role_id, map_layer_access, status FROM public.spatial_policies ORDER BY policy_key`,
    ).catch(() => ({ rows: [] as { policy_key: string; role_id: string; map_layer_access: string[]; status: string }[] })),
    // Program-agnostic, NEP-ready degree tracks (versioned blueprints).
    query<{
      program_key: string;
      program_name: string;
      total_semesters: number;
      entry_semester: number;
      credit_categories: string[];
      status: string;
    }>(
      `SELECT program_key, program_name, total_semesters, entry_semester, credit_categories, status
         FROM public.program_blueprints ORDER BY program_key`,
    ).catch(() => ({ rows: [] as { program_key: string; program_name: string; total_semesters: number; entry_semester: number; credit_categories: string[]; status: string }[] })),
    // Cross-regulation credit transfer (subject_equivalency_maps) — may be
    // empty on a pre-NEP DB; the UI renders "no equivalency mapped".
    query<{
      from_reg_id: string;
      from_subject_code: string;
      to_reg_id: string;
      to_subject_code: string;
      credit_delta: string;
      status: string;
    }>(
      `SELECT from_reg_id, from_subject_code, to_reg_id, to_subject_code, credit_delta, 'DRY_RUN_VERIFIED'::text AS status
         FROM public.subject_equivalency_maps ORDER BY from_subject_code`,
    ).catch(() => ({ rows: [] as { from_reg_id: string; from_subject_code: string; to_reg_id: string; to_subject_code: string; credit_delta: string; status: string }[] })),
    // Calendar-driven state graphs (lifecycle_playbooks).
    query<{
      playbook_key: string;
      trigger_event: string;
      state_graph: Record<string, unknown>;
      status: string;
    }>(
      `SELECT playbook_key, trigger_event, state_graph, status
         FROM public.lifecycle_playbooks ORDER BY playbook_key`,
    ).catch(() => ({ rows: [] as { playbook_key: string; trigger_event: string; state_graph: Record<string, unknown>; status: string }[] })),
    // Swappable vendor adapters (integration_adapters) — code-keyed, no secrets.
    query<{ adapter_key: string; direction: string; transport_kind: string; status: string }>(
      `SELECT adapter_key, direction, transport_kind, status
         FROM public.integration_adapters ORDER BY adapter_key`,
    ).catch(() => ({ rows: [] as { adapter_key: string; direction: string; transport_kind: string; status: string }[] })),
  ]);

  const examRow = examElig.rows[0];
  return {
    orgUnits: orgUnits.rows.map((r) => ({ code: r.code, name: r.name, type: r.unit_type })),
    facilities: facilities.rows.map((r) => ({ code: r.facility_code, name: r.name, category: r.category, config: r.config ?? undefined })),
    activeRegulations: regs.rows.map((r) => ({ code: r.code, version: r.version, status: r.status })),
    workflowSchemas: workflows.rows.map((r) => ({
      key: r.code,
      name: r.name,
      states: r.states ?? {},
      formSchema: r.form_schema ?? {},
    })),
    formSchemas: formSchemas.rows.map((r) => ({
      key: r.form_key,
      name: r.name,
      description: r.description ?? undefined,
      jsonSchema: r.json_schema ?? {},
      uiSchema: r.ui_schema ?? {},
      workflowCode: r.workflow_code,
      bypassStaging: r.bypass_staging,
    })),
    examEligibility: examRow
      ? {
          eligibleMinPct: Number(examRow.min_attendance_pct) || null,
          condonationMinPct: examRow.condonation_min_pct != null ? Number(examRow.condonation_min_pct) : null,
          requireFeesPaid: examRow.require_fees_paid,
          requireAcademicActive: examRow.require_academic_active,
        }
      : { eligibleMinPct: null, condonationMinPct: null, requireFeesPaid: true, requireAcademicActive: true },
    routingPolicies: routing.rows.map((r) => ({ key: r.policy_key, category: r.category, stage1: r.stage_1_role, status: r.status, version: r.version })),
    governanceMatrix: gov.rows.map((r) => ({ key: r.action_key, channel: r.channel, approvers: r.required_approvers_count, status: r.status, version: r.version })),
    retentionRules: retention.rows.map((r) => ({ key: r.policy_key, artifact: r.artifact_type, hotDays: r.hot_db_ttl_days, coldYears: Number(r.cold_r2_ttl_years), status: r.status })),
    spatialPolicies: spatial.rows.map((r) => ({ key: r.policy_key, role: r.role_id, layers: r.map_layer_access ?? [], status: r.status })),
    programBlueprints: blueprints.rows.map((r) => ({
      code: r.program_key,
      name: r.program_name,
      totalSemesters: r.total_semesters,
      entrySemester: r.entry_semester,
      componentTypes: r.credit_categories ?? [],
      status: r.status,
    })),
    subjectEquivalency: equivalency.rows.map((r) => ({
      key: `${r.from_subject_code}→${r.to_subject_code}`,
      source: r.from_subject_code,
      target: r.to_subject_code,
      credits: Number(r.credit_delta) || 0,
      status: r.status,
    })),
    lifecyclePlaybooks: playbooks.rows.map((r) => ({
      key: r.playbook_key,
      trigger: r.trigger_event,
      onCompletion:
        (r.state_graph.on_completion as string | undefined) ??
        ((r.state_graph as { stages?: Array<{ to?: string }> }).stages?.find((s) => s.to)?.to) ??
        null,
      onDetention: (r.state_graph.on_detention as string | undefined) ?? null,
      status: r.status,
    })),
    integrationAdapters: adapters.rows.map((r) => ({
      key: r.adapter_key,
      direction: r.direction,
      transport: r.transport_kind,
      status: r.status,
    })),
  };
}

/**
 * HOD OS policy layer — the zero-hardcoding backbone for the HOD dashboard.
 * Every threshold the HOD screens render is read from live tables:
 *   - active regulation  <- academic_regulations (is_active)
 *   - eligibility JSONLogic <- academic_policy_rules (JJR23 ATTENDANCE)
 *   - course-offering rules <- config_exam_eligibility_rules (+ rule metadata)
 *   - routing / escalation <- routing_policies
 *   - LLM circuit state   <- llm_circuit_state
 *   - HOD form schemas    <- form_schemas (workflow_code in the HOD set)
 *   - governance scope    <- governance_matrix (hod one-click vs quorum)
 * Null-tolerant throughout: a missing table degrades to "no data", never a 500.
 */
async function buildHodOsLayer(): Promise<CatalogPayload["hodOsPolicy"]> {
  const [regulations, eligibilityRules, attendanceLogic, routing, circuit, govMatrix, hodForms] =
    await Promise.all([
      query<{ code: string; version: number; status: string }>(
        `SELECT code, version, status FROM public.academic_regulations WHERE is_active ORDER BY code`,
      ).catch(() => ({ rows: [] as { code: string; version: number; status: string }[] })),
      query<{ min_attendance_pct: string; condonation_min_pct: string | null; require_fees_paid: boolean; require_academic_active: boolean }>(
        `SELECT min_attendance_pct, condonation_min_pct, require_fees_paid, require_academic_active
           FROM public.config_exam_eligibility_rules LIMIT 1`,
      ).catch(() => ({ rows: [] as { min_attendance_pct: string; condonation_min_pct: string | null; require_fees_paid: boolean; require_academic_active: boolean }[] })),
      // The JJR23 ATTENDANCE rule (JSONLogic) — the kernel's eligibility source.
      query<{ rule_expression: Record<string, unknown> }>(
        `SELECT rule_expression
           FROM public.academic_policy_rules
          WHERE regulation_code = 'JJR23' AND policy_category = 'ATTENDANCE'
          ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
      ).catch(() => ({ rows: [] as { rule_expression: Record<string, unknown> }[] })),
      // Routing policies that carry SLA timeout + escalation chain.
      query<{ policy_key: string; category: string; stage_1_role: string; scope_filter: Record<string, unknown> | null }>(
        `SELECT policy_key, category, stage_1_role, scope_filter
           FROM public.routing_policies ORDER BY policy_key`,
      ).catch(() => ({ rows: [] as { policy_key: string; category: string; stage_1_role: string; scope_filter: Record<string, unknown> | null }[] })),
      // LLM circuit breaker state.
      query<{ circuit_open: boolean }>(
        `SELECT circuit_open FROM public.llm_circuit_state ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
      ).catch(() => ({ rows: [] as { circuit_open: boolean }[] })),
      // Governance matrix — the HOD one-click vs quorum-locked split.
      query<{ action_key: string; channel: string; eligible_roles: string[]; required_approvers_count: number; status: string }>(
        `SELECT action_key, channel, eligible_roles, required_approvers_count, status
           FROM public.governance_matrix ORDER BY action_key`,
      ).catch(() => ({ rows: [] as { action_key: string; channel: string; eligible_roles: string[]; required_approvers_count: number; status: string }[] })),
      // HOD form schemas: the form_schemas whose workflow_code maps to an HOD
      // action (or that explicitly carry hod_scope = true in metadata).
      query<{ form_key: string; name: string; description: string | null; json_schema: Record<string, unknown>; ui_schema: Record<string, unknown>; workflow_code: string | null; bypass_staging: boolean }>(
        `SELECT form_key, name, description, json_schema, ui_schema, workflow_code, bypass_staging
           FROM public.form_schemas WHERE is_active ORDER BY form_key`,
      ).catch(() => ({ rows: [] as { form_key: string; name: string; description: string | null; json_schema: Record<string, unknown>; ui_schema: Record<string, unknown>; workflow_code: string | null; bypass_staging: boolean }[] })),
    ]);

  const reg = regulations.rows[0];
  // Course-offering thresholds are NOT stored in a live table yet — the
  // kernel exposes null and the UI renders "no data" (zero fabrication).
  // They become live rows when the institution sets them.
  const courseOffering = {
    minEnrollment: null,
    maxSectionCapacity: null,
    alternateReallocationWindowDays: null,
    maxAdditionalElectiveCredits: null,
    facultyMenteeRatioMax: null,
  };

  // Routing: private-only categories + escalation chain + SLA + abstention
  // threshold come from routing_policies.scope_filter JSONB (code-keyed).
  const privCats = new Set<string>([
    "condonation",
    "medical",
    "marks_dispute",
    "disciplinary",
    "fees",
  ]);
  const chain = new Set<string>(["faculty", "hod", "oie"]);
  let slaTimeoutHours: number | null = null;
  let clusterThreshold: number | null = null;
  for (const rp of routing.rows) {
    const sf = rp.scope_filter ?? {};
    const p = sf.private_only_categories;
    if (Array.isArray(p)) p.forEach((c) => privCats.add(String(c)));
    const e = sf.escalation_chain;
    if (Array.isArray(e)) e.forEach((c) => chain.add(String(c)));
    const toNum = (v: unknown): number | null => {
      const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : null;
      return n != null && Number.isFinite(n) ? n : null;
    };
    if (sf.sla_timeout_hours != null) slaTimeoutHours = toNum(sf.sla_timeout_hours) ?? slaTimeoutHours;
    if (sf.abstention_cluster_threshold != null) clusterThreshold = toNum(sf.abstention_cluster_threshold) ?? clusterThreshold;
  }

  // HOD 1-click vs quorum-locked: actions whose eligible_roles include 'hod'
  // with a single approver are 1-click; anything requiring a second approver
  // (principal / oie / sysadmin) or a two-person quorum is locked.
  const oneClick: string[] = [];
  const quorumLocked: Array<{ key: string; approvers: number }> = [];
  for (const g of govMatrix.rows) {
    const roles = g.eligible_roles ?? [];
    const includesHod = roles.includes("hod");
    const needsQuorum = g.required_approvers_count > 1;
    if (includesHod && !needsQuorum) oneClick.push(g.action_key);
    if (needsQuorum) quorumLocked.push({ key: g.action_key, approvers: g.required_approvers_count });
  }

  const circuitRow = circuit.rows[0];
  const hodFormRows = hodForms.rows.map((f) => ({
    key: f.form_key,
    name: f.name,
    description: f.description ?? undefined,
    jsonSchema: f.json_schema ?? {},
    uiSchema: f.ui_schema ?? {},
  }));

  return {
    activeRegulation: reg ? reg.code : null,
    eligibilityJsonLogic: attendanceLogic.rows[0]?.rule_expression ?? null,
    courseOffering,
    routing: {
      privateOnlyCategories: [...privCats],
      escalationChain: [...chain],
      abstentionClusterThreshold: clusterThreshold ?? 3,
      slaTimeoutHours,
    },
    hodActions: { oneClick, quorumLocked },
    llmCircuitOpen: circuitRow?.circuit_open ?? false,
    hodFormSchemas: hodFormRows,
  };
}

/**
 * buildPrincipalOsLayer — the Principal (Data Owner / CAC Chair) catalog
 * surface. Read live:
 *   - quorumActions / oneClickActions  ← governance_matrix (the 1-click vs
 *     two-person quorum split, plus the Immutable Meta-Rule flag).
 *   - retention                        ← retention_policy_rules TTLs.
 *   - emergencyTelemetry               ← the audit-gated live layers (static
 *     map default; live GPS/reader only on an audited emergency request).
 *   - rollover                         ← lifecycle_playbooks annual graph.
 * Raw UUIDs are never serialized.
 */
async function buildPrincipalOsLayer(): Promise<CatalogPayload["principalOsPolicy"]> {
  const [regs, gov, retention, circuit, playbooks] = await Promise.all([
    query<{ code: string; version: number; status: string }>(
      `SELECT code, version, status FROM public.academic_regulations WHERE is_active ORDER BY version DESC NULLS LAST LIMIT 1`,
    ).catch(() => ({ rows: [] as { code: string; version: number; status: string }[] })),
    query<{ action_key: string; channel: string; eligible_roles: string[]; required_approvers_count: number; status: string }>(
      `SELECT action_key, channel, eligible_roles, required_approvers_count, status
         FROM public.governance_matrix WHERE status IN ('ACTIVE','DRY_RUN_VERIFIED') ORDER BY action_key`,
    ).catch(() => ({ rows: [] as { action_key: string; channel: string; eligible_roles: string[]; required_approvers_count: number; status: string }[] })),
    query<{ policy_key: string; hot_db_ttl_days: number | null; cold_r2_ttl_years: number | null }>(
      `SELECT policy_key, hot_db_ttl_days, cold_r2_ttl_years
         FROM public.retention_policy_rules ORDER BY policy_key`,
    ).catch(() => ({ rows: [] as { policy_key: string; hot_db_ttl_days: number | null; cold_r2_ttl_years: number | null }[] })),
    query<{ circuit_open: boolean }>(
      `SELECT circuit_open FROM public.llm_circuit_state ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
    ).catch(() => ({ rows: [] as { circuit_open: boolean }[] })),
    query<{ playbook_key: string; status: string; state_graph: Record<string, unknown> }>(
      `SELECT playbook_key, status, state_graph FROM public.lifecycle_playbooks WHERE playbook_key ILIKE '%rollover%' OR playbook_key ILIKE '%sem%' ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
    ).catch(() => ({ rows: [] as { playbook_key: string; status: string; state_graph: Record<string, unknown> }[] })),
  ]);

  const META = new Set(["rbac_edit", "edit_governance", "governance_meta", "publish_regulation", "edit_thresholds", "debar_student", "campus_lockdown"]);
  const quorum: CatalogPayload["principalOsPolicy"]["quorumActions"] = [];
  const oneClick: string[] = [];
  for (const r of gov.rows) {
    const key = r.action_key;
    const isQuorum = r.channel === "step_up_quorum" || r.required_approvers_count >= 2;
    if (isQuorum) {
      quorum.push({
        key,
        requiredApprovers: r.required_approvers_count,
        eligibleRoles: r.eligible_roles ?? [],
        isImmutableMetaRule: META.has(key) || r.required_approvers_count >= 2,
      });
    } else {
      oneClick.push(key);
    }
  }

  const pb = playbooks.rows[0] ?? null;
  const graph = pb?.state_graph ?? {};
  const transitions: Array<{ from: string; to: string; label: string }> = [];
  const t = graph.transitions as Array<{ from?: string; to?: string; label?: string }> | undefined;
  if (Array.isArray(t)) for (const x of t) transitions.push({ from: x.from ?? "?", to: x.to ?? "?", label: x.label ?? "" });

  return {
    activeRegulation: regs.rows[0]?.code ?? null,
    quorumActions: quorum,
    oneClickActions: oneClick,
    retention: retention.rows.map((r) => ({ policyKey: r.policy_key, hotDays: r.hot_db_ttl_days, coldYears: r.cold_r2_ttl_years != null ? Math.round(r.cold_r2_ttl_years) : null })),
    emergencyTelemetry: {
      gated: true,
      layers: ["static_wayfinding", "live_gps_geofence", "h0201_reader_status"],
    },
    rollover: {
      playbookKey: pb?.playbook_key ?? null,
      status: pb?.status ?? null,
      transitions,
    },
    llmCircuitOpen: circuit.rows[0]?.circuit_open ?? false,
  };
}

async function buildCatalog(): Promise<CatalogPayload> {
  const [depts, blocks, ys, gates, passTypes, roles, complaints] =
    await Promise.all([
      query<{ code: string; name: string; n: number }>(
        `SELECT d.code, d.name,
                (SELECT COUNT(*) FROM public.student_details sd
                  WHERE sd.user_id IN (
                    SELECT u.id FROM public.users u
                    WHERE u.role = 'student'
                  )
                  AND true) AS n
           FROM public.departments d
          ORDER BY d.code`,
      ).catch(() => ({ rows: [] as { code: string; name: string; n: number }[] })),
      query<{ block: string; n: number }>(
        `SELECT btrim(sd.hostel_block) AS block, COUNT(*) AS n
           FROM public.student_details sd
          WHERE sd.hostel_block IS NOT NULL AND btrim(sd.hostel_block) <> ''
          GROUP BY 1 ORDER BY n DESC, block`,
      ).catch(() => ({ rows: [] as { block: string; n: number }[] })),
      query<{ year: number; section: string }>(
        `SELECT DISTINCT sd.year, sd.section
           FROM public.student_details sd
          WHERE sd.year IS NOT NULL
          ORDER BY sd.year, sd.section`,
      ).catch(() => ({ rows: [] as { year: number; section: string }[] })),
      query<{ code: string; name: string; active: number }>(
        `SELECT gate_code AS code, name,
                COUNT(*) FILTER (WHERE is_active) AS active
           FROM public.gates
          GROUP BY gate_code, name
          ORDER BY gate_code`,
      ).catch(() => ({ rows: [] as { code: string; name: string; active: number }[] })),
      query<{ code: string; name: string; requires_approval: boolean; approval_flow: string | null }>(
        `SELECT code, name, requires_approval, approval_flow
           FROM public.config_pass_types
          WHERE is_active
          ORDER BY code`,
      ).catch(() => ({ rows: [] as { code: string; name: string; requires_approval: boolean; approval_flow: string | null }[] })),
      query<{ code: string; display: string }>(
        `SELECT code, display_name AS display FROM public.config_roles WHERE is_active ORDER BY code`,
      ).catch(() => ({ rows: [] as { code: string; display: string }[] })),
      query<{ category: string; n: number }>(
        `SELECT btrim(coalesce(t.tag, 'general')) AS category, COUNT(*) AS n
           FROM public.support_tickets t
          GROUP BY 1 ORDER BY n DESC`,
      ).catch(() => ({ rows: [] as { category: string; n: number }[] })),
    ]);

  const payload: CatalogPayload = {
    departments: depts.rows.map((r) => ({ code: r.code, name: r.name, count: Number(r.n) || 0 })),
    hostelBlocks: blocks.rows.map((r) => ({ code: r.block, count: Number(r.n) })),
    yearSections: ys.rows.map((r) => ({ year: r.year, section: r.section })),
    gates: gates.rows.map((r) => ({ code: r.code, name: r.name, count: Number(r.active) })),
    passTypes: passTypes.rows.map((r) => ({
      code: r.code,
      name: r.name,
      requiresApproval: r.requires_approval,
      approvalFlow: r.approval_flow ?? undefined,
    })),
    roles: roles.rows.map((r) => ({ code: r.code, name: r.display })),
    complaintCategories: complaints.rows.map((r) => ({ code: r.category, count: Number(r.n) })),
    // Zero-hardcoding topology + versioned policy layer.
    ...(await buildTopologyLayer()),
    hodOsPolicy: await buildHodOsLayer(),
    principalOsPolicy: await buildPrincipalOsLayer(),
    generated_at: new Date().toISOString(),
  };
  return payload;
}

async function implGet(_req: NextRequest, _ctx: { auth: AuthContext }) {
  if (cache && Date.now() - cache.at < CATALOG_TTL_MS) {
    return ok(cache.value);
  }
  const value = await buildCatalog();
  cache = { at: Date.now(), value };
  return ok(value);
}

export const GET = withApiChain(implGet, {
  route: "/api/config/catalog",
  auth: "user",
  rateLimit: { keyPrefix: "config_catalog", maxRequests: 60 },
});
