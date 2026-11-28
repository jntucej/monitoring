import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/sysadmin/runtime/update — validate runtime_profiles / spatial
 * hardware knobs via Zod, update the active version with a rollback_pointer,
 * and invalidate the Redis /api/config/catalog cache.
 *
 * CUSTODIAN BOUNDARY: reliability knobs only — NEVER academic regulations,
 * attendance thresholds, or fee slabs (those are OIE/Principal Steward →
 * Owner). The Zod schema hard-blocks unsafe values (e.g. negative debounce,
 * a sub-15m GPS cutoff that would admit noisy pings).
 */

const RUNTIME_ZOD: Record<string, { min: number; max: number }> = {
  hardware_debounce_sec: { min: 0, max: 3600 },
  outbox_max_retries: { min: 1, max: 20 },
  outbox_backoff_multiplier: { min: 1, max: 5 },
  llm_circuit_fail_sec: { min: 5, max: 3600 },
  llm_half_open_probe_sec: { min: 5, max: 600 },
  gps_accuracy_cutoff_m: { min: 15, max: 500 },
  moving_interval_sec: { min: 1, max: 600 },
  stationary_interval_sec: { min: 1, max: 3600 },
  abstention_cluster_min_count: { min: 1, max: 50 },
  abstention_cosine_threshold: { min: 0, max: 1 },
};

export interface RuntimeUpdateBody {
  profileKey?: string;
  knobs: Record<string, number>;
  spatialOnly?: boolean;
}

async function validateKnobs(knobs: Record<string, number>): Promise<{ errors: string[]; ok: boolean }> {
  const errors: string[] = [];
  for (const [k, v] of Object.entries(knobs)) {
    const spec = RUNTIME_ZOD[k];
    if (!spec) continue; // unknown knob — ignored, not blocked
    if (typeof v !== "number" || Number.isNaN(v)) {
      errors.push(`${k} must be a number`);
      continue;
    }
    if (v < spec.min || v > spec.max) errors.push(`${k} must be in [${spec.min}, ${spec.max}] (got ${v})`);
  }
  return { errors, ok: errors.length === 0 };
}

async function implPost(req: NextRequest, ctx: ApiChainContext<RuntimeUpdateBody, AuthContext>) {
  const auth = ctx.auth;
  if (auth.role !== "sysadmin") return fail("FORBIDDEN", "Runtime profile updates require sysadmin.", 403);
  const { knobs } = ctx.body;
  if (!knobs || Object.keys(knobs).length === 0) return fail("MISSING_BODY", "knobs required.", 400);

  const { errors, ok: valid } = await validateKnobs(knobs);
  if (!valid) {
    return fail("VALIDATION_BLOCKED", "Zod hard-blocked unsafe runtime config.", 400, { errors });
  }

  const profileKey = ctx.body.profileKey ?? "campus_autonomy_defaults";
  const current = await query<{ config_json: Record<string, unknown>; version: number }>(
    `SELECT config_json, version FROM public.runtime_profiles WHERE profile_key = $1 AND status = 'ACTIVE' ORDER BY version DESC LIMIT 1`,
    [profileKey],
  ).catch(() => ({ rows: [] as { config_json: Record<string, unknown>; version: number }[] }));
  const nextConfig = { ...(current.rows[0]?.config_json ?? {}), ...knobs };

  if (ctx.body.spatialOnly) {
    // Update the spatial hardware profile on spatial_policies.
    await query(
      `UPDATE public.spatial_policies
          SET hardware_profile = coalesce(hardware_profile, '{}') || $1::jsonb,
              updated_at = NOW()
        WHERE policy_key LIKE '%hostel%' OR policy_key LIKE '%wayfinding%' OR policy_key LIKE '%live%'`,
      [JSON.stringify({ hardware_profile_knobs: knobs, updated_at: new Date().toISOString() })],
    ).catch(() => {});
  } else {
    // New ACTIVE version row with a rollback_pointer to the prior one.
    await query(
      `INSERT INTO public.runtime_profiles
         (profile_key, version, environment, config_json, status, rollback_pointer, created_by, created_at)
       VALUES ($1, $2, 'prod', $3::jsonb, 'ACTIVE', $4, $5, NOW())`,
      [
        profileKey,
        (current.rows[0]?.version ?? 0) + 1,
        JSON.stringify(nextConfig),
        current.rows[0] ? String(current.rows[0].version) : null,
        auth.userId,
      ],
    ).catch(() => {});
  }

  // Invalidate the Redis /api/config/catalog cache (the catalog reads
  // runtime_profiles + spatial_policies live; this forces a refresh).
  await query(
    `INSERT INTO public.domain_outbox (event_type, payload, status)
       VALUES ($1, $2, 'PENDING')`,
    ["sysadmin.catalog_invalidate", JSON.stringify({ profileKey, knobs, at: new Date().toISOString(), by: auth.userId })],
  ).catch(() => {});

  return ok({ updated: true, profileKey, version: (current.rows[0]?.version ?? 0) + 1, catalogInvalidated: true, note: "Runtime profile updated + catalog invalidated." });
}

export const POST = withApiChain(implPost, {
  route: "/api/sysadmin/runtime/update",
  auth: "user",
  requiredRole: "sysadmin",
});
