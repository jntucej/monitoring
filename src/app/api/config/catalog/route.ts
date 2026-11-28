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
}> {
  const [orgUnits, facilities, regs, workflows, formSchemas, examElig, routing, gov, retention, spatial] = await Promise.all([
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
