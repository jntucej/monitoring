-- 20270131000047_student_parent_visits.sql
-- Parent-visit scheduling for hostellers. A hosteller books a visit slot;
-- the warden/hostel approves; on approval a QR token is minted for the gate.
BEGIN;

CREATE TABLE IF NOT EXISTS public.student_parent_visits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  visitor_name  TEXT NOT NULL,
  relation      TEXT NOT NULL DEFAULT 'parent',
  visit_date    DATE NOT NULL,
  time_slot     TEXT NOT NULL,
  qr_token      TEXT UNIQUE,
  status        TEXT NOT NULL DEFAULT 'PENDING'
                CHECK (status IN ('PENDING','APPROVED','REJECTED','EXPIRED','USED')),
  hostel_block  TEXT,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_parent_visits_student
  ON public.student_parent_visits (student_id, visit_date);

ALTER TABLE public.student_parent_visits ENABLE ROW LEVEL SECURITY;

-- service_role (workers / sysadmin) has full access.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='student_parent_visits' AND policyname='svc_all_student_parent_visits'
  ) THEN
    CREATE POLICY svc_all_student_parent_visits ON public.student_parent_visits
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- A student can read + insert only their own visits.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='student_parent_visits' AND policyname='student_own_parent_visits'
  ) THEN
    CREATE POLICY student_own_parent_visits ON public.student_parent_visits
      FOR SELECT TO gate_app USING (student_id = current_setting('app.current_user_id', true)::uuid);
    CREATE POLICY student_own_parent_visits_ins ON public.student_parent_visits
      FOR INSERT TO gate_app WITH CHECK (student_id = current_setting('app.current_user_id', true)::uuid);
  END IF;
END $$;

COMMIT;
