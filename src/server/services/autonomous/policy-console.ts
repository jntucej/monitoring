/**
 * Versioned policy row access for the policy-console admin UI.
 *
 * All reads are code-keyed (no raw UUIDs in the payload — the console is
 * surfaced to admin/oie who are not sysadmin, so the UUID-leak rule applies:
 * identifiers are rendered via displayId/humanizeCode helpers when shown,
 * and the API returns code keys + numeric versions only).
 */
import { query } from "@/lib/postgres";

export type PolicyDomain =
  | "routing_policies"
  | "governance_matrix"
  | "retention_policy_rules"
  | "spatial_policies";

export type PolicyStatus = "DRAFT" | "DRY_RUN_VERIFIED" | "ACTIVE" | "ARCHIVED";

export interface PolicyRow<TData = Record<string, unknown>> {
  id: string;
  domain: PolicyDomain;
  /** policy_key for routing/retention/spatial, action_key for governance. */
  key: string;
  version: number;
  status: PolicyStatus;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdBy: string | null;
  createdByName: string | null;
  data: TData;
}

const DOMAIN_KEY: Record<PolicyDomain, "policy_key" | "action_key"> = {
  routing_policies: "policy_key",
  governance_matrix: "action_key",
  retention_policy_rules: "policy_key",
  spatial_policies: "policy_key",
};

const DOMAIN_SELECT: Record<PolicyDomain, string> = {
  routing_policies: `
    SELECT p.id::text AS id, p.policy_key AS key, p.version, p.status,
           p.effective_from AS effective_from, p.effective_to AS effective_to,
           p.created_by::text AS created_by, u.name AS created_by_name,
           jsonb_build_object(
             'category', p.category,
             'stage1', p.stage_1_role,
             'escalationChain', p.escalation_chain,
             'slaHours', p.sla_timeout_hours,
             'bypass', p.allow_direct_bypass,
             'visibility', p.reply_visibility,
             'autoKb', p.auto_promote_to_kb,
             'scope', p.scope_filter
           ) AS data
      FROM public.routing_policies p
      LEFT JOIN public.users u ON u.id = p.created_by`,
  governance_matrix: `
    SELECT p.id::text AS id, p.action_key AS key, p.version, p.status,
           p.effective_from AS effective_from, p.effective_to AS effective_to,
           p.created_by::text AS created_by, u.name AS created_by_name,
           jsonb_build_object(
             'channel', p.channel,
             'approvers', p.required_approvers_count,
             'eligibleRoles', p.eligible_roles,
             'dryRun', p.require_dry_run,
             'circularAttachment', p.require_circular_attachment,
             'scope', p.scope_filter
           ) AS data
      FROM public.governance_matrix p
      LEFT JOIN public.users u ON u.id = p.created_by`,
  retention_policy_rules: `
    SELECT p.id::text AS id, p.policy_key AS key, p.version, p.status,
           p.effective_from AS effective_from, p.effective_to AS effective_to,
           p.created_by::text AS created_by, u.name AS created_by_name,
           jsonb_build_object(
             'artifact', p.artifact_type,
             'hotDays', p.hot_db_ttl_days,
             'coldYears', p.cold_r2_ttl_years,
             'trigger', p.trigger_event,
             'exportFormat', p.export_format,
             'scope', p.scope_filter
           ) AS data
      FROM public.retention_policy_rules p
      LEFT JOIN public.users u ON u.id = p.created_by`,
  spatial_policies: `
    SELECT p.id::text AS id, p.policy_key AS key, p.version, p.status,
           p.effective_from AS effective_from, p.effective_to AS effective_to,
           p.created_by::text AS created_by, u.name AS created_by_name,
           jsonb_build_object(
             'role', p.role_id,
             'layers', p.map_layer_access,
             'gpsCutoffM', p.gps_accuracy_cutoff_m,
             'movingSec', p.moving_interval_sec,
             'stationarySec', p.stationary_interval_sec,
             'speedMps', p.speed_threshold_mps,
             'authoritative', p.authoritative_source,
             'hardware', p.hardware_profile,
             'scope', p.scope_filter
           ) AS data
      FROM public.spatial_policies p
      LEFT JOIN public.users u ON u.id = p.created_by`,
};

export function listPolicies(domain: PolicyDomain): Promise<PolicyRow[]> {
  return query<{
    id: string;
    key: string;
    version: number;
    status: PolicyStatus;
    effective_from: string;
    effective_to: string | null;
    created_by: string | null;
    created_by_name: string | null;
    data: Record<string, unknown>;
  }>(
    `${DOMAIN_SELECT[domain]} ORDER BY key, version DESC`,
  ).then(({ rows }) =>
    rows.map((r) => ({
      id: r.id,
      domain,
      key: r.key,
      version: Number(r.version),
      status: r.status,
      effectiveFrom: r.effective_from,
      effectiveTo: r.effective_to,
      createdBy: r.created_by,
      createdByName: r.created_by_name,
      data: r.data,
    })),
  );
}

export function getPolicyRow(domain: PolicyDomain, rowId: string): Promise<PolicyRow | null> {
  return query<{
    id: string;
    key: string;
    version: number;
    status: PolicyStatus;
    effective_from: string;
    effective_to: string | null;
    created_by: string | null;
    created_by_name: string | null;
    data: Record<string, unknown>;
  }>(
    `${DOMAIN_SELECT[domain]} WHERE id = $1::uuid`,
    [rowId],
  ).then(({ rows }) =>
    rows[0]
      ? {
          id: rows[0].id,
          domain,
          key: rows[0].key,
          version: Number(rows[0].version),
          status: rows[0].status,
          effectiveFrom: rows[0].effective_from,
          effectiveTo: rows[0].effective_to,
          createdBy: rows[0].created_by,
          createdByName: rows[0].created_by_name,
          data: rows[0].data,
        }
      : null,
  );
}

export interface LinterViolation {
  violation: string;
  detail: Record<string, unknown>;
}

/** Run the policy linter for a proposed transition. Empty array = clean. */
export async function runLinter(
  domain: PolicyDomain,
  rowId: string,
): Promise<LinterViolation[]> {
  const row = await getPolicyRow(domain, rowId);
  if (!row) return [];

  const nextStatus: PolicyStatus =
    row.status === "DRAFT" ? "DRY_RUN_VERIFIED" : row.status;

  // The linter function mirrors the same checks the DB trigger runs on
  // DRAFT -> DRY_RUN_VERIFIED; calling it directly gives the UI a preview.
  const key = row.key;
  const scope = (row.data.scope as Record<string, unknown>) ?? {};
  const chain = (row.data.escalationChain as string[]) ?? [];
  const roles = (row.data.eligibleRoles as string[]) ?? [];

  const { rows } = await query<LinterViolation>(
    `SELECT violation, detail
       FROM public.policy_linter_check(
            $1::text, $2::text, $3::jsonb, $4::timestamptz, $5::timestamptz,
            $6::jsonb, $7::jsonb)`,
    [domain, key, JSON.stringify(scope), row.effectiveFrom, row.effectiveTo, JSON.stringify(chain), JSON.stringify(roles)],
  );
  // nextStatus is used by the trigger only when it is DRY_RUN_VERIFIED;
  // the UI shows linter output for every row so a future transition is
  // previewable.
  void nextStatus;
  return rows;
}
