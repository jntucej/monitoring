import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/sysadmin/state — the single, zero-hardcoding state endpoint for the
 * Sysadmin (System Custodian) dashboard. Reads live from the real schema:
 *
 *   - Kernel health: domain_outbox queue counts (PENDING/SENT/DEAD_LETTER),
 *     llm_circuit_state, retention_policy_rules (180d/1yr → 8yr cold R2).
 *   - Outbox DLQ + processed_events dedup hits.
 *   - runtime_profiles knobs (Zod-validated; hardware_debounce_sec=300,
 *     outbox_max_retries=5, llm_circuit_fail_sec=60, gps_accuracy_cutoff_m=30,
 *     abstention_cluster_min_count=3, abstention_cosine_threshold=0.15…).
 *   - integration_adapters, automation_workflows, program_blueprints.
 *   - rbac_and_quorum: governance_matrix (the Immutable Meta-Rule actions
 *     step_up_quorum ×2), pending quorum co-signatures, RBAC roles.
 *
 * CUSTODIAN BOUNDARY: the Sysadmin enforces system integrity + topology. It
 * can NEVER solo-publish academic regulations / thresholds / fee slabs — those
 * render read-only with a "Custodian View Only" badge; activation is the
 * OIE/Principal Steward → Owner flow. 1-Click Topology is exclusive to the
 * Sysadmin and emits TOPOLOGY_MUTATED → domain_outbox + a Principal audit alert.
 */

export interface SysadminState {
  identity: { name: string | null; role: string };
  kernel: {
    outbox: { pending: number; sent: number; deadLetter: number; total: number };
    llmCircuit: { open: boolean; lastProbeAt: string | null; consecutiveFailures: number };
    retention: Array<{ artifactType: string; hotTtlDays: number; coldTtlYears: number; status: string; exportFormat: string }>;
    deadlineSweep: { open: number; breached: number };
  };
  outboxDlq: Array<{
    id: string;
    eventType: string;
    attempts: number;
    lastError: string | null;
    payload: string | null;
    createdAt: string;
  }>;
  dedupHits: Array<{
    key: string;
    source: string;
    eventType: string;
    processedAt: string;
  }>;
  runtimeProfiles: Array<{
    key: string;
    version: number;
    status: string;
    config: Record<string, unknown>;
  }>;
  adapters: Array<{
    key: string;
    direction: string;
    status: string;
    transport: string | null;
    idempotencyTemplate: string | null;
  }>;
  automationWorkflows: Array<{
    key: string;
    trigger: string;
    status: string;
    pipeline: string[];
  }>;
  programBlueprints: Array<{
    key: string;
    name: string;
    status: string;
  }>;
  rbacQuorum: {
    governance: Array<{
      actionKey: string;
      channel: string;
      requiredApprovers: number;
      status: string;
      isMetaRule: boolean;
    }>;
    pendingQuorum: Array<{
      actionKey: string;
      requestedBy: string | null;
      createdAt: string;
    }>;
    roles: Array<{ code: string; name: string | null }>;
  };
  llmCircuitOpen: boolean;
}

async function outboxCounts() {
  const r = await query<{ pending: number; sent: number; dead: number; total: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending,
       COUNT(*) FILTER (WHERE status = 'SENT')::int AS sent,
       COUNT(*) FILTER (WHERE status = 'DEAD_LETTER')::int AS dead,
       COUNT(*)::int AS total
     FROM public.domain_outbox`,
  ).catch(() => ({ rows: [] as { pending: number; sent: number; dead: number; total: number }[] }));
  const row = r.rows[0];
  return row
    ? { pending: Number(row.pending), sent: Number(row.sent), deadLetter: Number(row.dead), total: Number(row.total) }
    : { pending: 0, sent: 0, deadLetter: 0, total: 0 };
}

async function llmCircuit() {
  const r = await query<{ circuit_open: boolean; consecutive_failures: number; half_open_probe_at: string | null }>(
    `SELECT circuit_open, consecutive_failures, half_open_probe_at FROM public.llm_circuit_state ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
  ).catch(() => ({ rows: [] as { circuit_open: boolean; consecutive_failures: number; half_open_probe_at: string | null }[] }));
  const row = r.rows[0];
  return row
    ? { open: row.circuit_open, lastProbeAt: row.half_open_probe_at, consecutiveFailures: row.consecutive_failures }
    : { open: false, lastProbeAt: null, consecutiveFailures: 0 };
}

async function retention() {
  const r = await query<{ artifact_type: string; hot_db_ttl_days: number; cold_r2_ttl_years: number; status: string; export_format: string }>(
    `SELECT artifact_type, hot_db_ttl_days, cold_r2_ttl_years, status, export_format
       FROM public.retention_policy_rules WHERE status IN ('ACTIVE','DRY_RUN_VERIFIED') ORDER BY artifact_type`,
  ).catch(() => ({ rows: [] as { artifact_type: string; hot_db_ttl_days: number; cold_r2_ttl_years: number; status: string; export_format: string }[] }));
  return r.rows.map((x) => ({
    artifactType: x.artifact_type,
    hotTtlDays: Number(x.hot_db_ttl_days),
    coldTtlYears: Number(x.cold_r2_ttl_years),
    status: x.status,
    exportFormat: x.export_format,
  }));
}

async function deadlineSweep() {
  const r = await query<{ open: number; breached: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'OPEN')::int AS open,
       COUNT(*) FILTER (WHERE status = 'BREACHED')::int AS breached
     FROM public.deadline_watches`,
  ).catch(() => ({ rows: [] as { open: number; breached: number }[] }));
  return r.rows[0] ?? { open: 0, breached: 0 };
}

async function outboxDlq() {
  const r = await query<{ id: string; event_type: string; attempts: number; last_error: string | null; payload: string | null; created_at: string }>(
    `SELECT id::text, event_type, attempts, last_error, payload::text, created_at::text
       FROM public.domain_outbox
      WHERE status = 'DEAD_LETTER'
      ORDER BY created_at DESC LIMIT 25`,
  ).catch(() => ({ rows: [] as { id: string; event_type: string; attempts: number; last_error: string | null; payload: string | null; created_at: string }[] }));
  return r.rows.map((x) => ({
    id: x.id,
    eventType: x.event_type,
    attempts: Number(x.attempts),
    lastError: x.last_error,
    payload: x.payload,
    createdAt: x.created_at,
  }));
}

async function dedupHits() {
  const r = await query<{ idempotency_key: string; source: string; event_type: string; processed_at: string }>(
    `SELECT idempotency_key, source, event_type, processed_at::text
       FROM public.processed_events
      ORDER BY processed_at DESC NULLS LAST LIMIT 25`,
  ).catch(() => ({ rows: [] as { idempotency_key: string; source: string; event_type: string; processed_at: string }[] }));
  return r.rows.map((x) => ({ key: x.idempotency_key, source: x.source, eventType: x.event_type, processedAt: x.processed_at }));
}

async function runtimeProfiles() {
  const r = await query<{ profile_key: string; version: number; status: string; config_json: Record<string, unknown> }>(
    `SELECT profile_key, version, status, config_json FROM public.runtime_profiles ORDER BY profile_key`,
  ).catch(() => ({ rows: [] as { profile_key: string; version: number; status: string; config_json: Record<string, unknown> }[] }));
  return r.rows.map((x) => ({ key: x.profile_key, version: x.version, status: x.status, config: x.config_json ?? {} }));
}

async function adapters() {
  const r = await query<{ adapter_key: string; direction: string; status: string; transport_kind: string | null; idempotency_key_template: string | null }>(
    `SELECT adapter_key, direction, status, transport_kind, idempotency_key_template FROM public.integration_adapters ORDER BY adapter_key`,
  ).catch(() => ({ rows: [] as { adapter_key: string; direction: string; status: string; transport_kind: string | null; idempotency_key_template: string | null }[] }));
  return r.rows.map((x) => ({ key: x.adapter_key, direction: x.direction, status: x.status, transport: x.transport_kind, idempotencyTemplate: x.idempotency_key_template }));
}

async function automationWorkflows() {
  const r = await query<{ workflow_key: string; trigger_event: string; status: string; action_pipeline: unknown }>(
    `SELECT workflow_key, trigger_event, status, action_pipeline FROM public.automation_workflows ORDER BY workflow_key`,
  ).catch(() => ({ rows: [] as { workflow_key: string; trigger_event: string; status: string; action_pipeline: unknown }[] }));
  return r.rows.map((x) => {
    const pipeline = Array.isArray(x.action_pipeline) ? (x.action_pipeline as unknown[]).map((a) => (typeof a === "string" ? a : JSON.stringify(a))) : [];
    return { key: x.workflow_key, trigger: x.trigger_event, status: x.status, pipeline };
  });
}

async function programBlueprints() {
  const r = await query<{ program_key: string; program_name: string; status: string }>(
    `SELECT program_key, program_name, status FROM public.program_blueprints ORDER BY program_key`,
  ).catch(() => ({ rows: [] as { program_key: string; program_name: string; status: string }[] }));
  return r.rows.map((x) => ({ key: x.program_key, name: x.program_name, status: x.status }));
}

async function rbacQuorum() {
  // The Immutable Meta-Rule actions (step_up_quorum ×2) — these are the
  // governance_matrix rows where channel = 'step_up_quorum'.
  const gov = await query<{ action_key: string; channel: string; required_approvers_count: number; status: string }>(
    `SELECT action_key, channel, required_approvers_count, status FROM public.governance_matrix ORDER BY action_key`,
  ).catch(() => ({ rows: [] as { action_key: string; channel: string; required_approvers_count: number; status: string }[] }));
  // Pending quorum co-signatures (policy_change_requests awaiting activation
  // on the Immutable Meta-Rule actions). The Meta-Rule target_ref encodes the
  // governance_matrix action key.
  const pending = await query<{ target_ref: string; drafted_by: string | null; created_at: string }>(
    `SELECT pcr.target_ref, pcr.drafted_by, pcr.created_at::text
       FROM public.policy_change_requests pcr
      WHERE pcr.status IN ('DRAFT','PENDING_APPROVAL')
        AND pcr.target_ref IN ('publish_regulation','edit_thresholds','campus_lockdown','rbac_edit','governance_matrix')
      ORDER BY pcr.created_at DESC LIMIT 25`,
  ).catch(() => ({ rows: [] as { target_ref: string; drafted_by: string | null; created_at: string }[] }));
  const roles = await query<{ code: string; name: string | null }>(
    `SELECT code, name FROM public.config_roles ORDER BY code`,
  ).catch(() => ({ rows: [] as { code: string; name: string | null }[] }));
  return {
    governance: gov.rows.map((g) => ({
      actionKey: g.action_key,
      channel: g.channel,
      requiredApprovers: Number(g.required_approvers_count),
      status: g.status,
      isMetaRule: g.channel === "step_up_quorum",
    })),
    pendingQuorum: pending.rows.map((p) => ({ actionKey: p.target_ref, requestedBy: p.drafted_by, createdAt: p.created_at })),
    roles: roles.rows.map((r) => ({ code: r.code, name: r.name })),
  };
}

async function implGet(_req: NextRequest, ctx: ApiChainContext<unknown, AuthContext>) {
  const auth = ctx.auth;
  // Custodian surface: sysadmin only (the Immutable Meta-Rule + 1-Click
  // Topology are exclusive to the sysadmin role).
  if (auth.role !== "sysadmin") {
    return fail("FORBIDDEN", "Custodian surface requires the sysadmin role.", 403);
  }
  const nameRow = await query<{ name: string }>(
    `SELECT name FROM public.users WHERE id = $1 LIMIT 1`, [auth.userId],
  ).catch(() => ({ rows: [] as { name: string }[] }));

  const [outbox, llm, retentionList, sweep, dlq, dedup, profiles, adapterList, workflows, blueprints, rbac] =
    await Promise.all([
      outboxCounts(), llmCircuit(), retention(), deadlineSweep(),
      outboxDlq(), dedupHits(), runtimeProfiles(), adapters(),
      automationWorkflows(), programBlueprints(), rbacQuorum(),
    ]);

  return ok({
    identity: { name: nameRow.rows[0]?.name ?? null, role: auth.role },
    kernel: { outbox, llmCircuit: llm, retention: retentionList, deadlineSweep: sweep },
    outboxDlq: dlq,
    dedupHits: dedup,
    runtimeProfiles: profiles,
    adapters: adapterList,
    automationWorkflows: workflows,
    programBlueprints: blueprints,
    rbacQuorum: rbac,
    llmCircuitOpen: Boolean(llm.open),
  } satisfies SysadminState);
}

export const GET = withApiChain(implGet, {
  route: "/api/sysadmin/state",
  auth: "user",
  requiredRole: "sysadmin",
});
