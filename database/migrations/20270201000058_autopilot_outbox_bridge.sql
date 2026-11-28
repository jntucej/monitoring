-- U003: AUTOPILOT outbox bridge (cross-DB event fan-out).
--
-- Target database: gate_monitor
--
-- The AUTOPILOT control plane persists mission lifecycle events into its
-- dedicated autopilot_runtime DB (event_outbox table, U002). The Gate
-- Monitor worker bridges those events into gate_monitor.domain_outbox so
-- the existing outbox-relay + notification stack can fan them out to the
-- @agent trace feed, SSE subscribers, and retention ledger.
--
-- Dedup: the bridge builds a deterministic idempotency_key per AUTOPILOT
-- event (autopilot:<mission_id>:<event_id>:<event_type>:<version>). To make
-- a replay a no-op, domain_outbox gains a unique idempotency_key column so
-- the bridge's INSERT ... ON CONFLICT (idempotency_key) DO NOTHING is a
-- true dedup (the table previously had no such column).
--
-- No AUTOPILOT object is touched; this only extends gate_monitor.

ALTER TABLE public.domain_outbox
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_domain_outbox_idempotency
    ON public.domain_outbox (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- Track the AUTOPILOT bridge as a source marker so downstream relays can
-- distinguish campus-native events from bridged control-plane events.
CREATE INDEX IF NOT EXISTS idx_domain_outbox_bridge_source
    ON public.domain_outbox (event_type)
    WHERE event_type LIKE 'autopilot.%' OR event_type IN (
        'mission.created', 'mission.transition', 'mission.completed',
        'mission.failed', 'mission.cancelled'
    );
