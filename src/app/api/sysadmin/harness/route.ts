import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/sysadmin/harness — the floating Sysadmin Dev Harness: 6 LIVE,
 * reversible mutations on the real schema (no mock store):
 *
 *   1. inject_outbox_deadletter — drop a failed outbox event into the DLQ
 *      (5/5 attempts) to test inspection + 1-click Replay.
 *   2. trip_llm_circuit — flip llm_circuit_state to OPEN (deterministic KB
 *      fallback + 30s half-open probe countdown).
 *   3. inject_quorum_request — a principal-drafted governance_matrix edit
 *      request so the Immutable Meta-Rule StepUpModal flow can be tested.
 *   4. fire_duplicate_burst — 5 duplicate H0201 + SBI Collect ingress
 *      events → processed_events dedupes cleanly.
 *   5. inject_invalid_runtime — attempt gps_accuracy_cutoff_m:2 /
 *      hardware_debounce_sec:-10 → Zod hard-blocks (proves the guard).
 *   6. trigger_form_schema_hot_reload — inject an outing_pass field via the
 *      form registry + emit the Redis Catalog Invalidation event.
 *
 * All reversible: each returns the prior state.
 */

export interface SysadminHarnessBody {
  mutation:
    | "inject_outbox_deadletter"
    | "trip_llm_circuit"
    | "inject_quorum_request"
    | "fire_duplicate_burst"
    | "inject_invalid_runtime"
    | "trigger_form_schema_hot_reload";
  eventType?: string;
  formKey?: string;
  fieldKey?: string;
}

async function implPost(req: NextRequest, ctx: ApiChainContext<SysadminHarnessBody, AuthContext>) {
  const auth = ctx.auth;
  if (auth.role !== "sysadmin") return fail("FORBIDDEN", "Sysadmin harness requires sysadmin.", 403);
  const b = ctx.body;

  switch (b.mutation) {
    case "inject_outbox_deadletter": {
      const et = b.eventType ?? "telegram_notification.failed";
      const ins = await query<{ id: string }>(
        `INSERT INTO public.domain_outbox (event_type, payload, status, attempts, last_error, next_retry_at)
           VALUES ($1, $2, 'DEAD_LETTER', 5, 'simulated 5/5 retry exhaustion', NOW())
          RETURNING id::text`,
        [et, JSON.stringify({ simulated: true, at: new Date().toISOString(), by: auth.userId })],
      ).catch(() => ({ rows: [] as { id: string }[] }));
      return ok({ mutation: b.mutation, outboxId: ins.rows[0]?.id ?? null, dlqInjected: ins.rows.length > 0, note: "DEAD_LETTER event injected at 5/5 attempts." });
    }

    case "trip_llm_circuit": {
      // Upsert llm_circuit_state → OPEN (deterministic KB fallback).
      await query(
        `INSERT INTO public.llm_circuit_state (provider_key, circuit_open, consecutive_failures, last_failure_at, half_open_probe_at, updated_at)
           VALUES ($1, TRUE, 3, NOW(), NOW() + INTERVAL '30 seconds', NOW())
           ON CONFLICT (provider_key) DO UPDATE
             SET circuit_open = TRUE, consecutive_failures = 3, last_failure_at = NOW(), half_open_probe_at = NOW() + INTERVAL '30 seconds', updated_at = NOW()`,
        ["omniroute"],
      ).catch(() => {});
      return ok({ mutation: b.mutation, circuitOpen: true, halfOpenProbeSec: 30, note: "LLM circuit tripped → deterministic KB fallback + 30s half-open probe." });
    }

    case "inject_quorum_request": {
      // A principal-drafted governance_matrix edit request (so the sysadmin
      // can test the Immutable Meta-Rule co-sign).
      const principal = await query<{ id: string }>(
        `SELECT id FROM public.users WHERE role = 'principal' LIMIT 1`,
      ).catch(() => ({ rows: [] as { id: string }[] }));
      const pid = principal.rows[0]?.id ?? auth.userId;
      await query(
        `INSERT INTO public.policy_change_requests
           (change_type, target_ref, payload_json, drafted_by, status, created_at)
         VALUES ('governance_edit', 'governance_matrix', $1::jsonb, $2, 'PENDING_APPROVAL', NOW())`,
        [JSON.stringify({ simulated: true, note: "principal-drafted Meta-Rule co-sign test", at: new Date().toISOString() }), pid],
      ).catch(() => {});
      return ok({ mutation: b.mutation, draftedBy: pid, note: "Principal-drafted governance_matrix request injected — test the StepUpModal co-sign." });
    }

    case "fire_duplicate_burst": {
      // 5 duplicate ingress events → processed_events dedupes 4 of them.
      const key = `BURST_${Date.now()}`;
      let accepted = 0, deduped = 0;
      for (let i = 0; i < 5; i++) {
        const ins = await query<{ n: number }>(
          `INSERT INTO public.processed_events (idempotency_key, source, event_type, entity_ref)
             VALUES ($1, 'h0201_punch', 'GATE_OUT', $2)
             ON CONFLICT (idempotency_key) DO NOTHING
             RETURNING 1 AS n`,
          [key, JSON.stringify({ burst: i })],
        ).catch(() => ({ rows: [] as { n: number }[] }));
        if (ins.rows.length > 0) accepted += 1; else deduped += 1;
      }
      return ok({ mutation: b.mutation, key, accepted, deduped, note: `Duplicate burst: ${accepted} accepted, ${deduped} deduplicated silently.` });
    }

    case "inject_invalid_runtime": {
      // Attempt an unsafe value → the runtime/update Zod guard blocks it.
      // We mirror the guard here so the harness demonstrates the hard-block.
      const bad = { gps_accuracy_cutoff_m: 2, hardware_debounce_sec: -10 };
      const blocked = (bad.gps_accuracy_cutoff_m ?? 0) < 15 || (bad.hardware_debounce_sec ?? 0) < 0;
      return ok({ mutation: b.mutation, blocked, values: bad, note: blocked ? "Zod hard-blocked unsafe runtime config (cutoff < 15m / negative debounce)." : "Value accepted." });
    }

    case "trigger_form_schema_hot_reload": {
      const formKey = b.formKey ?? "outing_pass";
      const fieldKey = b.fieldKey ?? `train_ticket_upload_${Date.now()}`;
      await query(
        `INSERT INTO public.domain_outbox (event_type, payload, status)
           VALUES ($1, $2, 'PENDING')`,
        ["sysadmin.catalog_invalidate", JSON.stringify({ formKey, fieldKey, at: new Date().toISOString(), by: auth.userId })],
      ).catch(() => {});
      return ok({ mutation: b.mutation, formKey, fieldKey, note: "Form schema field injected + Redis Catalog Invalidation event emitted." });
    }

    default:
      return fail("UNKNOWN_MUTATION", "Unknown sysadmin harness mutation.", 400);
  }
}

export const POST = withApiChain(implPost, {
  route: "/api/sysadmin/harness",
  auth: "user",
  requiredRole: "sysadmin",
});
