-- 20270131000015_security_shifts.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.security_shift_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  start_time   time NOT NULL,
  end_time     time NOT NULL,
  days_of_week int[] NOT NULL DEFAULT '{1,2,3,4,5,6,7}',
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_shifts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   uuid REFERENCES public.security_shift_templates(id),
  shift_date    date NOT NULL,
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz NOT NULL,
  supervisor_id uuid NOT NULL,
  status        text NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'published', 'active', 'closed', 'cancelled')),
  published_at  timestamptz,
  closed_at     timestamptz,
  UNIQUE (shift_date, template_id)
);

CREATE INDEX IF NOT EXISTS idx_security_shifts_active
  ON public.security_shifts (starts_at, ends_at, status);

CREATE TABLE IF NOT EXISTS public.shift_post_assignments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id       uuid NOT NULL REFERENCES public.security_shifts(id) ON DELETE CASCADE,
  post_id        uuid NOT NULL REFERENCES public.security_posts(id),
  operator_id    uuid NOT NULL,
  status         text NOT NULL DEFAULT 'assigned'
                   CHECK (status IN ('assigned', 'checked_in', 'checked_out', 'no_show', 'relieved')),
  checked_in_at  timestamptz,
  checked_out_at timestamptz,
  handover_from  uuid REFERENCES public.shift_post_assignments(id),
  notes          text,
  UNIQUE (shift_id, operator_id)
);

CREATE INDEX IF NOT EXISTS idx_spa_operator ON public.shift_post_assignments (operator_id, shift_id);
CREATE INDEX IF NOT EXISTS idx_spa_shift ON public.shift_post_assignments (shift_id, status);

CREATE TABLE IF NOT EXISTS public.guard_live_location (
  operator_id uuid NOT NULL,
  shift_id    uuid NOT NULL REFERENCES public.security_shifts(id) ON DELETE CASCADE,
  lat         numeric(9,6) NOT NULL,
  lng         numeric(9,6) NOT NULL,
  accuracy_m  int,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (operator_id, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_guard_live_recent
  ON public.guard_live_location (shift_id, recorded_at DESC);

COMMIT;
