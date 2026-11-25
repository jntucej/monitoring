-- 20270131000034_institutional_deadlines.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.institutional_deadlines (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  deadline_type      text NOT NULL,
  description        text,
  academic_year_code text REFERENCES public.academic_years(code),
  semester           int,
  scope              text NOT NULL DEFAULT 'campus',
  owner_role         text NOT NULL DEFAULT 'admin',
  start_at           timestamptz NOT NULL DEFAULT now(),
  deadline_at        timestamptz NOT NULL,
  extended_until     timestamptz,
  status             text NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'extended', 'expired', 'archived')),
  created_by         uuid,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deadlines_status_at
  ON public.institutional_deadlines (status, deadline_at ASC);

COMMIT;
