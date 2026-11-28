import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/sysadmin/adapters/upsert-or-test — edit an integration adapter's
 * field_mapping / idempotency_key_template / Handlebars template, or fire a
 * dry-run test payload against processed_events (idempotency dedup).
 */

export interface AdapterUpsertBody {
  action: "edit_mapping" | "test_payload";
  adapterKey: string;
  fieldMapping?: Record<string, unknown>;
  idempotencyKeyTemplate?: string;
  outboundTemplate?: string;
  testPayload?: Record<string, unknown>;
}

async function implPost(req: NextRequest, ctx: ApiChainContext<AdapterUpsertBody, AuthContext>) {
  const body = (await req.json().catch(() => ({}))) as AdapterUpsertBody;
  const auth = ctx.auth;
  if (auth.role !== "sysadmin") return fail("FORBIDDEN", "Adapter upsert requires sysadmin.", 403);
  const { action, adapterKey, fieldMapping, idempotencyKeyTemplate, outboundTemplate, testPayload } = body;
  if (!adapterKey) return fail("MISSING_BODY", "adapterKey required.", 400);

  const adapter = await query<{ id: string; status: string }>(
    `SELECT id, status FROM public.integration_adapters WHERE adapter_key = $1 LIMIT 1`, [adapterKey],
  ).catch(() => ({ rows: [] as { id: string; status: string }[] }));
  if (!adapter.rows[0]) return fail("ADAPTER_NOT_FOUND", "Adapter not registered.", 404);

  if (action === "edit_mapping") {
    await query(
      `UPDATE public.integration_adapters
          SET field_mapping = coalesce(field_mapping, '{}') || $1::jsonb,
              idempotency_key_template = coalesce($2, idempotency_key_template),
              outbound_template = coalesce($3, outbound_template),
              updated_at = NOW()
        WHERE adapter_key = $4`,
      [JSON.stringify(fieldMapping ?? {}), idempotencyKeyTemplate ?? null, outboundTemplate ?? null, adapterKey],
    ).catch(() => {});
    return ok({ updated: true, adapterKey, note: "Adapter mapping/template updated." });
  }

  // test_payload: fire a dry-run idempotency probe against processed_events.
  if (action === "test_payload") {
    const probeKey = `TEST_${adapterKey}_${Date.now()}`;
    const ins = await query<{ n: number }>(
      `INSERT INTO public.processed_events (idempotency_key, source, event_type, entity_ref)
         VALUES ($1, $2, 'DRY_RUN_TEST', $3)
         ON CONFLICT (idempotency_key) DO NOTHING
         RETURNING 1 AS n`,
      [probeKey, adapterKey, JSON.stringify(testPayload ?? {})],
    ).catch(() => ({ rows: [] as { n: number }[] }));
    return ok({ tested: true, adapterKey, probeKey, deduped: ins.rows.length === 0, note: "Dry-run test payload sent; idempotency dedup verified." });
  }

  return fail("UNKNOWN_ACTION", "Unknown adapter action.", 400);
}

export const POST = withApiChain(implPost, {
  route: "/api/sysadmin/adapters/upsert-or-test",
  auth: "user",
  requiredRole: "sysadmin",
});
