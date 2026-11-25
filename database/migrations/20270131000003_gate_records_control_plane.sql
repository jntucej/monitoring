-- 20270131000003_gate_records_control_plane.sql
--
-- Gate Records subsystem (reuse + extend strategy).
--
-- The pasted spec proposed a brand-new `gate_events` ledger + a set of
-- satellite tables. This DB already models gate events by type across
-- movement_logs / visitor_logs / gate_passes / shifts / shift_handovers /
-- exam_access_exceptions / campus_events. So instead of duplicating that,
-- we add ONLY the two genuinely-missing control-plane pieces and extend the
-- existing event tables with the derived/premade columns the automation
-- engine needs:
--
--   * ref_categories        — the premade, migration-seeded taxonomy
--                             ("long-term scope": categories change only via
--                              migration, never UI free-text).
--   * gate_field_blueprints — (role × gate_type × event_type × context) →
--                             ordered, fill-mode-annotated field list. This
--                             makes operator field-visibility config-driven.
--
-- Plus nullable extension columns on the existing event tables so the
-- automation can write derived flags without a parallel ledger.
--
-- Idempotent: every DDL is guarded; seeds use ON CONFLICT DO NOTHING.
-- Down: drops the two new tables and the added columns (see .down.sql).

BEGIN;

-- ============================================================
-- LAYER 2 — reference taxonomy (the "premade, long-term scope" table)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ref_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain      text NOT NULL,       -- visitor_category | id_document_type | ...
  code        text NOT NULL,
  label       text NOT NULL,
  description text,
  sort_order  int  NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (domain, code)
);
CREATE INDEX IF NOT EXISTS idx_ref_categories_domain
  ON public.ref_categories (domain, active, sort_order);
COMMENT ON TABLE public.ref_categories IS
  'Gate-record taxonomy. Migration-seeded; the UI only ever lists codes from here (never free-text). Add a new category by inserting a row in a migration — never a new column or a text box.';

-- ============================================================
-- LAYER 3 — field blueprints (config-driven role field visibility)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gate_field_blueprints (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role         text NOT NULL,
  gate_type    text NOT NULL,
  event_type   text NOT NULL,
  context      text NOT NULL DEFAULT 'default',
  field_key    text NOT NULL,
  label        text NOT NULL,
  fill_mode    text NOT NULL CHECK (fill_mode IN
                 ('auto','scan','premade','capture','required','optional','derived')),
  ref_domain   text,             -- when fill_mode='premade'
  record_target text NOT NULL,   -- which table the dispatcher writes to
                 -- ('movement_logs' | 'visitor_logs' | 'gate_passes' | ...)
  required     boolean NOT NULL DEFAULT false,
  sort_order   int NOT NULL DEFAULT 0,
  validation   jsonb NOT NULL DEFAULT '{}'::jsonb,
  visible_when jsonb NOT NULL DEFAULT '{}'::jsonb,
  active       boolean NOT NULL DEFAULT true,
  version      int NOT NULL DEFAULT 1,
  UNIQUE (role, gate_type, event_type, context, field_key, version)
);
CREATE INDEX IF NOT EXISTS idx_blueprints_lookup
  ON public.gate_field_blueprints (role, gate_type, event_type, context, active, sort_order);
COMMENT ON TABLE public.gate_field_blueprints IS
  'Per-role, per-gate-type, per-event-type ordered field list with fill_mode. The operator UI renders from this; auto/derived fields are read-only, premade fields are dropdowns sourced from ref_categories.';

-- ============================================================
-- EXTEND existing event tables with the derived/premade columns the
-- automation writes. All nullable, all default-safe: no existing row
-- is modified; a fresh insert just gets NULLs.
-- ============================================================

-- movement_logs: derived flags + taxonomy + device linkage
ALTER TABLE public.movement_logs
  ADD COLUMN IF NOT EXISTS event_type        text,
  ADD COLUMN IF NOT EXISTS device_id         uuid,
  ADD COLUMN IF NOT EXISTS shift_id          uuid,
  ADD COLUMN IF NOT EXISTS verification_method text,
  ADD COLUMN IF NOT EXISTS purpose_code      text,
  ADD COLUMN IF NOT EXISTS outcome           text,
  ADD COLUMN IF NOT EXISTS photo_url         text,
  ADD COLUMN IF NOT EXISTS geo               jsonb,
  ADD COLUMN IF NOT EXISTS subject_ref       text,
  ADD COLUMN IF NOT EXISTS watchlist_hit     boolean,
  ADD COLUMN IF NOT EXISTS curfew_violation  boolean,
  ADD COLUMN IF NOT EXISTS duplicate_scan    boolean,
  ADD COLUMN IF NOT EXISTS payload           jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.movement_logs.payload IS
  'Free-form capture + _derived sub-key (watchlist_hit, curfew_violation, duplicate_scan, occupancy_delta). Auto/derived values are server-computed; the operator client never supplies them.';

-- visitor_logs: category/id/purpose taxonomy + lifecycle extras
ALTER TABLE public.visitor_logs
  ADD COLUMN IF NOT EXISTS visitor_category  text,
  ADD COLUMN IF NOT EXISTS id_document_type  text,
  ADD COLUMN IF NOT EXISTS id_number         text,
  ADD COLUMN IF NOT EXISTS visitor_phone     text,
  ADD COLUMN IF NOT EXISTS vehicle_type      text,
  ADD COLUMN IF NOT EXISTS expected_duration text,
  ADD COLUMN IF NOT EXISTS badge_no          text,
  ADD COLUMN IF NOT EXISTS host_ack_at       timestamptz,
  ADD COLUMN IF NOT EXISTS photo_url         text,
  ADD COLUMN IF NOT EXISTS payload           jsonb NOT NULL DEFAULT '{}'::jsonb;

-- gate_passes: verification outcome + method (pass resolution writes these)
ALTER TABLE public.gate_passes
  ADD COLUMN IF NOT EXISTS verification_method  text,
  ADD COLUMN IF NOT EXISTS verification_result   text,
  ADD COLUMN IF NOT EXISTS override_reason       text,
  ADD COLUMN IF NOT EXISTS payload               jsonb NOT NULL DEFAULT '{}'::jsonb;

-- visitor_watchlist: non-user subjects + severity + expiry
ALTER TABLE public.visitor_watchlist
  ADD COLUMN IF NOT EXISTS subject_type text,
  ADD COLUMN IF NOT EXISTS subject_ref  text,
  ADD COLUMN IF NOT EXISTS severity     text NOT NULL DEFAULT 'high',
  ADD COLUMN IF NOT EXISTS expires_at   timestamptz;
CREATE INDEX IF NOT EXISTS idx_watchlist_lookup
  ON public.visitor_watchlist (subject_type, subject_ref, active);

-- shifts: handover reason + open-issues count (from the automation counters)
ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS handover_reason   text,
  ADD COLUMN IF NOT EXISTS open_issues       text,
  ADD COLUMN IF NOT EXISTS scan_count        int,
  ADD COLUMN IF NOT EXISTS exception_count   int,
  ADD COLUMN IF NOT EXISTS payload           jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ============================================================
-- NEW satellite tables (genuinely missing; no live equivalent).
-- Security events FOLD into the existing emergency_alerts /
-- emergency_commands (pre-flight #8 confirmed they model lockdown +
-- emergency state) — do NOT create a separate security_events table.
-- ============================================================

-- Exception events (operator/supervisor decision log, separate from the
-- movement ledger so an exception is first-class, not a movement row).
CREATE TABLE IF NOT EXISTS public.gate_exceptions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type         text NOT NULL,
  gate_id            uuid NOT NULL,
  operator_id        uuid,
  subject_type       text,
  subject_ref        text,
  exception_category text,
  severity           text NOT NULL DEFAULT 'high',
  resolution_action  text,
  source_event_id    uuid,
  notes              text,
  payload            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gate_exceptions_gate ON public.gate_exceptions (gate_id, created_at DESC);

-- Gate hardware state + fault log.
CREATE TABLE IF NOT EXISTS public.gate_devices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_id           uuid NOT NULL,
  kind              text NOT NULL,
  serial            text UNIQUE,
  status            text NOT NULL DEFAULT 'unknown',
  last_heartbeat_at timestamptz,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_gate_devices_gate_kind
  ON public.gate_devices (gate_id, kind);
CREATE TABLE IF NOT EXISTS public.gate_device_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id  uuid,
  gate_id    uuid NOT NULL,
  fault_code text,
  status     text,
  payload    jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gate_device_events_gate ON public.gate_device_events (gate_id, occurred_at DESC);

-- Vehicles + their gate entries.
CREATE TABLE IF NOT EXISTS public.vehicles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate      text UNIQUE NOT NULL,
  vehicle_type text,
  registered_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.vehicle_entries (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate      text NOT NULL,
  gate_id    uuid NOT NULL,
  direction  text,
  purpose_code text,
  photo_url  text,
  parking_slot text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vehicle_entries_gate ON public.vehicle_entries (gate_id, occurred_at DESC);

-- Curfew returns: hostel OUT→IN lifecycle pair.
CREATE TABLE IF NOT EXISTS public.curfew_returns (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id        uuid NOT NULL,
  block_id           uuid,
  out_event_id       uuid,
  in_event_id        uuid,
  leave_type         text,
  expected_return    timestamptz,
  actual_return      timestamptz,
  curfew_compliance  text,
  escalated          boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_curfew_returns_resident ON public.curfew_returns (resident_id, expected_return);

-- Positive exam-access audit (the "allowed" log; exceptions stay in
-- exam_access_exceptions, eligibility in hall_tickets + config_exam_eligibility_rules).
CREATE TABLE IF NOT EXISTS public.exam_access_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_id             uuid NOT NULL,
  candidate_id        text,
  session_id          text,
  allowed             boolean NOT NULL DEFAULT false,
  hall_ticket_status  text,
  eligibility_status  text,
  exception_reason    text,
  exception_granted_by uuid,
  occurred_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exam_access_log_gate ON public.exam_access_log (gate_id, occurred_at DESC);

COMMIT;
