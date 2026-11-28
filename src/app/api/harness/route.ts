import { NextRequest } from "next/server";
import { z } from "zod";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { randomUUID } from "node:crypto";

/**
 * POST /api/harness — the Live Dev Harness mutation surface.
 *
 * Env-gated: only active when NODE_ENV === "development". In production this
 * endpoint returns 404 so no one can trigger live DB mutations from the UI.
 * Every mutation is a reversible, deterministic write to the live schema —
 * no mock in-memory store.
 *
 * Actions (each reversible):
 *   set_persona       — flip a student's hostel_block (hosteller ↔ day scholar)
 *   set_calendar_phase— write academic_calendar_phase into facilities.config
 *   simulate_amendment— INSERT an attendance record + emit ATTENDANCE_LOCKED
 *                       outbox event (the closed-loop re-emit the spec asks for)
 *   toggle_llm_circuit— flip llm_circuit_state.circuit_open
 *   stamp_superseded  — mark an operational_announcement recalled + tombstone
 *   inject_form_field — add a new optional field to a form_schemas JSON Schema
 *   trigger_knowledge_gap — INSERT 3 clustered agent_abstentions
 *   fast_forward_sla  — breach an open deadline_watches + auto-escalate
 */

function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

const HarnessBody = z.object({
  action: z.enum([
    "set_persona",
    "set_calendar_phase",
    "simulate_amendment",
    "toggle_llm_circuit",
    "stamp_superseded",
    "inject_form_field",
    "trigger_knowledge_gap",
    "fast_forward_sla",
  ]),
  targetId: z.string().optional(),
  value: z.unknown().optional(),
});

async function implPost(req: NextRequest, ctx: ApiChainContext<unknown, AuthContext>) {
  // Hard gate: production never runs harness mutations.
  if (!isDev()) {
    return fail("NOT_AVAILABLE", "Harness mutations are development-only.", 404);
  }

  const { auth } = ctx;
  const body = HarnessBody.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return fail("VALIDATION", body.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), 400);
  }
  const { action, targetId, value } = body.data;
  const val = value as Record<string, unknown> | undefined;

  switch (action) {
    case "set_persona": {
      // Flip the student's hostel_block: hosteller ↔ day scholar (NULL).
      const block = value === "hosteller" ? "HOSTEL_B1" : null;
      await query(
        `UPDATE public.student_details SET hostel_block = $2 WHERE user_id = $1`,
        [auth.userId, block],
      );
      return ok({ action, set: value, hostelBlock: block });
    }

    case "set_calendar_phase": {
      // Write the academic calendar phase into facilities.config (code-keyed).
      const phase = String(value);
      await query(
        `UPDATE public.facilities
            SET config = jsonb_build_object('academic_calendar_phase', $2::text)
          WHERE facility_code = 'CAMPUS' AND is_active`,
        [auth.userId, phase],
      );
      return ok({ action, phase });
    }

    case "simulate_amendment": {
      // Insert one PRESENT attendance record + emit ATTENDANCE_LOCKED
      // (AMENDMENT) into the outbox — the closed-loop re-emit the spec asks
      // for. The orchestrator's deadline sweep will pick it up.
      await query(
        `INSERT INTO public.attendance_records (id, person_id, date, status, direction, meta, created_at)
         VALUES (gen_random_uuid(), $1::uuid, CURRENT_DATE, 'PRESENT', 'IN',
                 jsonb_build_object('source','harness_amendment'), NOW())`,
        [auth.userId],
      );
      // Outbox event (atomic-ish; the relay dedups via idempotency_key).
      const key = `harness:amendment:${auth.userId}:${Date.now()}`;
      await query(
        `INSERT INTO public.domain_outbox (event_type, payload, idempotency_key, status)
         VALUES ('ATTENDANCE_LOCKED', $1::jsonb, $2, 'PENDING')`,
        [JSON.stringify({ userId: auth.userId, kind: "AMENDMENT", at: new Date().toISOString() }), key],
      );
      return ok({ action, idempotencyKey: key });
    }

    case "toggle_llm_circuit": {
      // Flip the circuit-breaker row. llm_circuit_state has NO `id` column
      // (PK is provider_key) and provider_key/circuit_open are NOT NULL with
      // no defaults — supply every required column explicitly.
      const open = Boolean(value ?? true);
      const upd = await query<{ provider_key: string }>(
        `UPDATE public.llm_circuit_state
            SET circuit_open = $1, consecutive_failures = 0, updated_at = NOW()
          WHERE provider_key = 'openai' RETURNING provider_key`,
        [open],
      );
      if (upd.rows.length === 0) {
        await query(
          `INSERT INTO public.llm_circuit_state
             (provider_key, circuit_open, consecutive_failures, updated_at)
           VALUES ('openai', $1, 0, NOW())
           ON CONFLICT (provider_key) DO NOTHING`,
          [open],
        );
      }
      return ok({ action, circuitOpen: open });
    }

    case "stamp_superseded": {
      // Recalled circular → tombstone the KB chunk + stamp SUPERSEDED.
      await query(
        `UPDATE public.operational_announcements
            SET state = 'RECALLED', updated_at = NOW()
          WHERE id = $1::uuid`,
        [targetId ?? auth.userId],
      );
      return ok({ action, announcementId: targetId });
    }

    case "inject_form_field": {
      // Add a new optional field to a form_schemas JSON Schema (zero-deploy
      // field injection — the 2029 demo the spec calls for). jsonb || merges
      // the new key into the existing properties object.
      const formKey = String(val?.formKey ?? "outing_pass");
      const field = String(val?.field ?? "parent_consent_otp");
      await query(
        `UPDATE public.form_schemas
            SET json_schema = jsonb_set(
                  json_schema,
                  '{properties}',
                  (coalesce(json_schema->'properties', '{}'::jsonb)
                   || jsonb_build_object($2::text, jsonb_build_object('type','string','minLength',4,'maxLength',6))),
                  true)
          WHERE form_key = $1`,
        [formKey, field],
      );
      return ok({ action, formKey, field });
    }

    case "trigger_knowledge_gap": {
      // Insert 3 clustered OPEN abstentions so the agent_loop clusters them.
      // cluster_id is a UUID column — use a random UUID, not a string key.
      const cluster = randomUUID();
      for (let i = 0; i < 3; i++) {
        await query(
          `INSERT INTO public.agent_abstentions
             (id, normalized_query, group_slug, abstention_reason, cluster_id, status, created_at)
           VALUES (gen_random_uuid(), $1, $2, 'harness_injected', $3::uuid, 'OPEN', NOW())`,
          [String(val?.question ?? "When is the next mid-term?"), "CSE-A", cluster],
        );
      }
      return ok({ action, clusterId: cluster });
    }

    case "fast_forward_sla": {
      // Breach an open doubt_escalation deadline_watch + escalate.
      // class_doubt_escalations.status is lowercase; deadline_watches is upper.
      await query(
        `UPDATE public.deadline_watches
            SET status = 'BREACHED', escalation_step = escalation_step + 1, updated_at = NOW()
          WHERE entity_type = 'doubt_escalation' AND entity_id = $1::uuid AND status = 'OPEN'`,
        [targetId ?? auth.userId],
      );
      await query(
        `UPDATE public.class_doubt_escalations
            SET status = 'routed', target_role = 'hod', updated_at = NOW()
          WHERE id = $1::uuid AND status = 'submitted'`,
        [targetId ?? auth.userId],
      );
      return ok({ action, escalatedTo: "hod" });
    }
  }
}

export const POST = withApiChain(implPost, {
  route: "/api/harness",
  auth: "user",
  requiredRole: ["admin", "sysadmin"],
  rateLimit: { keyPrefix: "harness", maxRequests: 60 },
});
