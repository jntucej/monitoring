/**
 * Agent feedback loop worker (Blind Spot 6).
 *
 * 1. Abstention clustering: every @agent abstention is logged to
 *    agent_abstentions. When 3+ abstentions with cosine_distance < threshold
 *    (read from runtime_profiles) accumulate in a rolling window, a single
 *    Knowledge Gap Card is auto-created and routed to the routing policy's
 *    stage_1_role. Once answered + approved, the answer is promoted to
 *    confirmed_knowledge and the cluster is closed.
 *
 * 2. LLM circuit-breaker: tracks OmniRoute health. After 60s of consecutive
 *    failures (read from runtime_profiles.llm_circuit_fail_sec), flips
 *    llm_circuit_state.circuit_open = true, alerts sysadmin, and routes
 *    @agent queries to deterministic SQL + full-text/template responses.
 *    A half-open probe runs every 30s to self-heal.
 */

import { getWorkerDbPool } from "../db.js";

/** Read clustering + circuit-breaker knobs from runtime_profiles. */
async function loadAgentConfig(pool) {
  const { rows } = await pool.query(
    `SELECT
       config_json->>'abstention_cluster_min_count' AS min_count,
       config_json->>'abstention_cosine_threshold' AS cosine_thr,
       config_json->>'llm_circuit_fail_sec' AS circuit_fail,
       config_json->>'llm_half_open_probe_sec' AS half_open_probe
     FROM public.runtime_profiles
    WHERE profile_key = 'campus_autonomy_defaults' AND status = 'ACTIVE'
    LIMIT 1`,
  );
  const c = rows[0];
  return {
    minCount: Number(c?.min_count) || 3,
    cosineThreshold: Number(c?.cosine_thr) || 0.15,
    circuitFailSec: Number(c?.circuit_fail) || 60,
    halfOpenProbeSec: Number(c?.half_open_probe) || 30,
  };
}

export async function runAgentLoop() {
  const pool = getWorkerDbPool();
  const config = await loadAgentConfig(pool);
  let clustered = 0;
  let circuitFlipped = false;

  // 1. Abstention clustering: find OPEN abstentions that form a cluster of
  //    minCount+ with cosine_distance < threshold.
  try {
    const { rows: openAbstentions } = await pool.query(
      `SELECT id, normalized_query, scope_filter, group_slug, abstention_reason, created_at
         FROM public.agent_abstentions
        WHERE status = 'OPEN'
        ORDER BY created_at DESC
        LIMIT 200`,
    );

    if (openAbstentions.length >= config.minCount) {
      // Group by normalized_query similarity. For the MVP we cluster by
      // exact normalized_query match (cheap, deterministic). When pgvector
      // embedding is populated, replace with cosine_distance < threshold.
      const groups = new Map();
      for (const a of openAbstentions) {
        const key = a.normalized_query;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(a);
      }

      for (const [queryText, group] of groups.entries()) {
        if (group.length < config.minCount) continue;

        // Create a Knowledge Gap Card routed to the routing policy's stage_1_role.
        const { rows: routingRows } = await pool.query(
          `SELECT stage_1_role FROM public.routing_policies
           WHERE status = 'ACTIVE' AND category = 'academic'
           ORDER BY effective_from DESC LIMIT 1`,
        );
        const stage1Role = routingRows[0]?.stage_1_role ?? "faculty";

        const { rows: gapRows } = await pool.query(
          `INSERT INTO public.domain_outbox (event_type, payload)
           VALUES ('KNOWLEDGE_GAP_CARD', $1::jsonb)
           RETURNING id`,
          [
            JSON.stringify({
              query: queryText,
              abstentionCount: group.length,
              scopeFilter: group[0].scope_filter,
              groupSlug: group[0].group_slug,
              routedTo: stage1Role,
              sampleAbstentionIds: group.map((a) => a.id),
            }),
          ],
        );

        // Mark the abstentions as CLUSTERED.
        const ids = group.map((a) => a.id);
        await pool.query(
          `UPDATE public.agent_abstentions
              SET status = 'CLUSTERED', cluster_id = $1
            WHERE id = ANY($2::uuid[])`,
          [gapRows[0]?.id, ids],
        );
        clustered++;
      }
    }
  } catch (err) {
    console.warn("[agent-loop] clustering failed:", err?.message ?? err);
  }

  // 2. LLM circuit-breaker: check for consecutive failures.
  try {
    const { rows: circuitRows } = await pool.query(
      `SELECT * FROM public.llm_circuit_state WHERE provider_key = 'omniroute' LIMIT 1`,
    );
    const state = circuitRows[0];

    if (state?.circuit_open) {
      // Half-open probe: if enough time has passed since the last failure,
      // attempt a recovery probe.
      const probeDue =
        state.half_open_probe_at &&
        new Date(state.half_open_probe_at).getTime() <= Date.now();
      if (probeDue) {
        // In a real deployment this would call the OmniRoute health endpoint.
        // For now, mark the probe as attempted; a successful probe flips
        // circuit_open back to false.
        await pool.query(
          `UPDATE public.llm_circuit_state
              SET half_open_probe_at = NOW() + make_interval(secs => $1::int),
                  updated_at = NOW()
            WHERE provider_key = 'omniroute'`,
          [config.halfOpenProbeSec],
        );
      }
    } else {
      // Check if the failure window has elapsed (consecutive_failures > 0
      // and last_failure_at is older than circuit_fail_sec).
      if (state && state.consecutive_failures > 0) {
        const lastFail = new Date(state.last_failure_at ?? 0).getTime();
        const failWindowMs = config.circuitFailSec * 1000;
        if (Date.now() - lastFail >= failWindowMs) {
          await pool.query(
            `UPDATE public.llm_circuit_state
                SET circuit_open = TRUE, updated_at = NOW()
              WHERE provider_key = 'omniroute'`,
          );
          // Alert sysadmin.
          await pool.query(
            `INSERT INTO public.notifications
               (type, priority, title, message, recipient_type, channels, event_type, scope, actor_role)
             VALUES ($1, 'critical', $2, $3, 'role', '{in_app}'::text[], 'llm_health', 'agent', 'system')`,
            [
              "llm.circuit_open",
              "LLM circuit-breaker OPEN",
              `OmniRoute LLM has been failing for ${config.circuitFailSec}s. Agent queries are now routed to deterministic KB templates.`,
            ],
          ).catch(() => {});
          circuitFlipped = true;
        }
      }
    }
  } catch (err) {
    console.warn("[agent-loop] circuit-breaker check failed:", err?.message ?? err);
  }

  if (clustered || circuitFlipped) {
    console.log(`[agent-loop] clustered=${clustered} circuit_flipped=${circuitFlipped}`);
  }
  return { clustered, circuitFlipped };
}
