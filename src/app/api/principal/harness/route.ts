import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/principal/harness — the 6 live Dev-Harness mutations for the
 * Principal dashboard. Each one writes a REAL row (reversible) so the UI's
 * degraded / blocked states are exercisable end-to-end:
 *
 *   inject_linter_error    → inserts an overlapping tstzrange draft routing row
 *   simulate_co_approver   → co-signs a pending policy_change_request (2nd sig)
 *   inject_emergency_flood → inserts a retroactive condonation-relaxation draft
 *   trigger_topology_alert → records a sysadmin 1-Click Topology audit event
 *   toggle_llm_circuit     → flips llm_circuit_state.circuit_open (+ outbox DLQ)
 *   test_rollback          → reverts the latest ACTIVE routing policy to DRAFT
 */

interface Body {
  action:
    | "inject_linter_error"
    | "simulate_co_approver"
    | "inject_emergency_flood"
    | "trigger_topology_alert"
    | "toggle_llm_circuit"
    | "test_rollback";
  detail?: Record<string, unknown>;
}

async function implPost(req: NextRequest, ctx: ApiChainContext<unknown, AuthContext>) {
  const auth = ctx.auth;
  if (!["principal", "sysadmin", "admin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Harness requires principal/sysadmin/admin.", 403);
  }
  const body = (await req.json().catch(() => ({}))) as Body;
  const d = body.detail ?? {};

  switch (body.action) {
    case "inject_linter_error": {
      // An overlapping tstzrange draft — the linter's overlap check will flag it.
      await query(
        `INSERT INTO public.routing_policies
           (policy_key, status, scope_filter, effective_from, effective_to)
         VALUES ($1, 'DRAFT', $2, NOW(), NOW() + INTERVAL '30 days')
         ON CONFLICT DO NOTHING`,
        [`harness_overlap_${auth.userId.slice(0, 8)}`, JSON.stringify({ private_only_categories: ["fees"] })],
      ).catch(() => ({}));
      return ok({ action: body.action, injected: "overlapping tstzrange draft" });
    }

    case "simulate_co_approver": {
      // Co-sign the most recent PENDING_APPROVAL request (the 2nd signature).
      const r = await query<{ id: string }>(
        `SELECT id FROM public.policy_change_requests WHERE status = 'PENDING_APPROVAL' ORDER BY created_at DESC LIMIT 1`,
      ).catch(() => ({ rows: [] as { id: string }[] }));
      if (r.rows.length === 0) return fail("NOT_FOUND", "No pending request to co-sign.", 404);
      await query(
        `UPDATE public.policy_change_requests SET approved_by = $1::uuid, status = 'PUBLISHED' WHERE id = $2::uuid`,
        [auth.userId, r.rows[0].id],
      );
      return ok({ action: body.action, coSigned: r.rows[0].id });
    }

    case "inject_emergency_flood": {
      // A mid-semester retroactive condonation relaxation draft (65% → 60%).
      await query(
        `INSERT INTO public.policy_change_requests
           (id, change_type, target_ref, payload_json, effective_from, retroactive_override, drafted_by, status, created_at)
         VALUES (gen_random_uuid(), 'retroactive_override', 'exam_eligibility', $1, NOW(), true, $2::uuid, 'DRAFT', NOW())`,
        [JSON.stringify({ summary: "Emergency condonation relaxation 65→60", from: d.from, to: d.to }), auth.userId],
      ).catch(() => ({}));
      return ok({ action: body.action, injected: "retroactive condonation relaxation draft" });
    }

    case "trigger_topology_alert": {
      // A sysadmin 1-Click Topology audit event (add_course / rebuild).
      await query(
        `INSERT INTO public.audit_events
           (event_id, actor_id, actor_type, role_context, action, resource, resource_id, before_state, created_at)
         VALUES (gen_random_uuid(), $1::uuid, 'human', 'sysadmin', $2, 'topology', $3, NULL, NOW())`,
        [
          auth.userId,
          (d.action as string) ?? "add_course",
          (d.resource as string) ?? "B.Tech AI & DS",
        ],
      ).catch(() => ({}));
      return ok({ action: body.action, injected: "sysadmin topology audit event" });
    }

    case "toggle_llm_circuit": {
      // Flip the LLM circuit breaker + optionally push a DLQ outbox row.
      // llm_circuit_state may be empty (no provider seen yet) — upsert so the
      // Autopilot Health KPI flips visibly.
      const cur = await query<{ circuit_open: boolean }>(
        `SELECT circuit_open FROM public.llm_circuit_state ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
      ).catch(() => ({ rows: [] as { circuit_open: boolean }[] }));
      const next = !(cur.rows[0]?.circuit_open ?? false);
      await query(
        `INSERT INTO public.llm_circuit_state (provider_key, circuit_open, updated_at)
         VALUES ('default', $1, NOW())
         ON CONFLICT (provider_key) DO UPDATE SET circuit_open = $1, updated_at = NOW()`,
        [next],
      ).catch(() => ({}));
      let dlqInjected = false;
      if (d.dlq) {
        dlqInjected = Boolean(
          (await query<{ n: number }>(
            `INSERT INTO public.domain_outbox (id, event_type, payload, status, created_at)
             VALUES (gen_random_uuid(), 'harness.dlq', $1, 'DEAD_LETTER', NOW()) RETURNING 1`,
            [JSON.stringify({ reason: d.reason ?? "simulated DLQ" })],
          ).catch(() => ({ rows: [] as { n: number }[] }))).rows.length,
        );
      }
      return ok({ action: body.action, circuitOpen: next, dlqInjected });
    }

    case "test_rollback": {
      // Revert the latest ACTIVE routing policy to DRAFT (the rollback_pointer
      // primitive, live).
      const r = await query<{ policy_key: string }>(
        `SELECT policy_key FROM public.routing_policies WHERE status = 'ACTIVE' ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
      ).catch(() => ({ rows: [] as { policy_key: string }[] }));
      if (r.rows.length === 0) return fail("NOT_FOUND", "No ACTIVE routing policy to roll back.", 404);
      await query(`UPDATE public.routing_policies SET status = 'DRAFT' WHERE policy_key = $1`, [r.rows[0].policy_key]);
      return ok({ action: body.action, rolledBack: r.rows[0].policy_key });
    }

    default:
      return fail("VALIDATION_ERROR", `Unknown harness action '${body.action}'.`, 400);
  }
}

export const POST = withApiChain(implPost, {
  route: "/api/principal/harness",
  auth: "user",
  requiredRole: ["principal", "sysadmin", "admin"],
});
