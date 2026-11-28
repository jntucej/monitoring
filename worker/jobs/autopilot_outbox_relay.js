/**
 * AUTOPILOT outbox relay — publishes unpublished mission events from the
 * dedicated autopilot_runtime DB into the Gate Monitor domain_outbox
 * (cross-database event bridge).
 *
 * Closed-loop: the AUTOPILOT control plane writes mission events + outbox
 * rows atomically (one PG transaction per transition). This relay reads
 * unpublished outbox rows (FOR UPDATE SKIP LOCKED), pushes each into the
 * gate_monitor domain_outbox (same-DB, transactional), and marks the
 * AUTOPILOT row published. A crash after the gate_monitor write but before
 * the mark-published leaves the row unpublished — the next sweep re-reads
 * it (at-least-once; the gate_monitor domain_outbox dedups by
 * idempotency_key so a replay is a no-op).
 *
 * Persistent: all state is in PostgreSQL (both DBs). The relay is a
 * stateless cron job — a restart resumes from the last published row.
 *
 * Harness mode: the relay only PUBLISHES; it never mutates mission state.
 * The control plane's deterministic state machine is the only sanctioned
 * writer of lifecycle transitions.
 *
 * Run cadence: 30s (same as the domain_outbox relay).
 */
import { getWorkerDbPool, query } from "../db.js";
import { getAutopilotDbPool } from "./autopilot_db.js";

const RELAY_BATCH = 25;

export async function autopilotOutboxRelayRun() {
  const gatePool = getWorkerDbPool();
  const apPool = getAutopilotDbPool();

  // Claim unpublished AUTOPILOT outbox rows.
  const { rows: claims } = await apPool.query(
    `SELECT id, event_id, mission_id, tenant_id, event_type, event_version,
            correlation_id, causation_id, payload, produced_at
       FROM public.event_outbox
      WHERE published = FALSE
      ORDER BY produced_at
      LIMIT $1
      FOR UPDATE SKIP LOCKED`,
    [RELAY_BATCH],
  );

  if (claims.length === 0) return { published: 0 };

  let published = 0;
  for (const row of claims) {
    // Idempotency key: deterministic from the AUTOPILOT event identity, so a
    // replay is deduped by the gate_monitor domain_outbox PK.
    const idempotencyKey = `autopilot:${row.mission_id}:${row.event_id}:${row.event_type}:${row.event_version}`;
    const eventPayload = {
      source: "autopilot_runtime",
      event_id: row.event_id,
      mission_id: row.mission_id,
      tenant_id: row.tenant_id,
      correlation_id: row.correlation_id,
      causation_id: row.causation_id,
      produced_at: row.produced_at,
      ...row.payload,
    };

    try {
      await gatePool.query(
        `INSERT INTO public.domain_outbox (event_type, payload, idempotency_key, status)
         VALUES ($1, $2, $3, 'PENDING')
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [`autopilot.${row.event_type}`, JSON.stringify(eventPayload), idempotencyKey],
      );
      await apPool.query(
        `UPDATE public.event_outbox SET published = TRUE, published_at = NOW() WHERE id = $1`,
        [row.id],
      );
      published += 1;
    } catch (err) {
      // Leave the row unpublished; next sweep retries (at-least-once).
      console.error(`[autopilot-outbox-relay] publish failed for ${row.id}:`, err instanceof Error ? err.message : err);
    }
  }

  return { published, claimed: claims.length };
}

// Wire into the worker index when the caller wants it.
export default autopilotOutboxRelayRun;
