-- 20270131000049_campus_facility_feedback.sql
-- Per-facility ratings + comments (canteen, lab, gym, hostel, etc.).
-- Student-scoped: a student can read + insert their own feedback.
BEGIN;

CREATE TABLE IF NOT EXISTS public.campus_facility_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  facility_type   TEXT NOT NULL,
  block_or_room   TEXT,
  rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campus_facility_feedback_facility
  ON public.campus_facility_feedback (facility_type, created_at DESC);

ALTER TABLE public.campus_facility_feedback ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='campus_facility_feedback' AND policyname='svc_all_campus_facility_feedback'
  ) THEN
    CREATE POLICY svc_all_campus_facility_feedback ON public.campus_facility_feedback
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='campus_facility_feedback' AND policyname='student_own_facility_feedback'
  ) THEN
    CREATE POLICY student_own_facility_feedback ON public.campus_facility_feedback
      FOR SELECT TO gate_app USING (student_id = current_setting('app.current_user_id', true)::uuid);
    CREATE POLICY student_own_facility_feedback_ins ON public.campus_facility_feedback
      FOR INSERT TO gate_app WITH CHECK (student_id = current_setting('app.current_user_id', true)::uuid);
  END IF;
END $$;

COMMIT;
