-- 20270131000009_mess_tokens_v2.sql
-- Mess subsystem v2: rotating TOTP secrets, monotonic counter state,
-- dedicated mess_scan_events ledger, mess_counters, mess_session_counters,
-- and station_type/counter_id on gate_devices.
-- Mess never writes to movement_logs or gate_events.

BEGIN;

ALTER TABLE public.gate_devices
  ADD COLUMN IF NOT EXISTS station_type text NOT NULL DEFAULT 'gate'
    CHECK (station_type IN ('gate', 'mess', 'exam')),
  ADD COLUMN IF NOT EXISTS counter_id uuid;

CREATE TABLE IF NOT EXISTS public.mess_counters (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  block_id   text,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mess_totp_secrets (
  student_id uuid NOT NULL,
  secret_day date NOT NULL,
  secret_enc text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, secret_day)
);

CREATE TABLE IF NOT EXISTS public.mess_totp_state (
  student_id   uuid NOT NULL,
  session_id   uuid NOT NULL REFERENCES public.mess_days(id) ON DELETE CASCADE,
  last_counter int NOT NULL DEFAULT 0,
  last_scan_at timestamptz,
  PRIMARY KEY (student_id, session_id)
);

CREATE TABLE IF NOT EXISTS public.mess_scan_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL,
  session_id  uuid NOT NULL REFERENCES public.mess_days(id) ON DELETE CASCADE,
  counter_id  uuid NOT NULL,
  operator_id uuid NOT NULL,
  device_id   uuid NOT NULL,
  scanned_at  timestamptz NOT NULL DEFAULT now(),
  outcome     text NOT NULL CHECK (outcome IN (
    'ok', 'duplicate', 'expired', 'wrong_session', 'invalid_code',
    'tampered', 'not_registered', 'manual_override', 'wrong_device'
  )),
  reason_text text,
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_mess_scan_events_session
  ON public.mess_scan_events (session_id, outcome, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_mess_scan_events_student
  ON public.mess_scan_events (student_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_mess_scan_events_counter
  ON public.mess_scan_events (counter_id, scanned_at DESC);

CREATE TABLE IF NOT EXISTS public.mess_session_counters (
  session_id      uuid NOT NULL REFERENCES public.mess_days(id) ON DELETE CASCADE,
  counter_id      uuid NOT NULL REFERENCES public.mess_counters(id) ON DELETE CASCADE,
  served          int NOT NULL DEFAULT 0,
  capacity        int,
  special_item_id uuid,
  PRIMARY KEY (session_id, counter_id)
);

COMMIT;
