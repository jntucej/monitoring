-- 20270131000010_mess_special_schedules.sql
-- Live counter-bound special item schedules (named mess_special_schedules
-- because mess_special_items already exists as a catalog table).

BEGIN;

CREATE TABLE IF NOT EXISTS public.mess_special_schedules (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           uuid NOT NULL REFERENCES public.mess_days(id) ON DELETE CASCADE,
  counter_id           uuid NOT NULL REFERENCES public.mess_counters(id) ON DELETE CASCADE,
  item_name            text NOT NULL,
  expected_count       int NOT NULL CHECK (expected_count > 0),
  served_count         int NOT NULL DEFAULT 0,
  low_threshold        numeric NOT NULL DEFAULT 0.20,
  low_notified_at      timestamptz,
  sold_out_notified_at timestamptz,
  status               text NOT NULL DEFAULT 'planned'
                         CHECK (status IN ('planned', 'live', 'sold_out', 'closed')),
  created_by           uuid NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mess_special_schedules_session
  ON public.mess_special_schedules (session_id, counter_id, status);

COMMIT;
