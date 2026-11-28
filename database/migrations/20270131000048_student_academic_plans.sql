-- 20270131000048_student_academic_plans.sql
-- Per-student academic planning (semester electives, project, internship
-- status). One active plan per student.
BEGIN;

CREATE TABLE IF NOT EXISTS public.student_academic_plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  semester          TEXT NOT NULL,
  electives         JSONB NOT NULL DEFAULT '[]',
  project_title     TEXT,
  internship_status TEXT NOT NULL DEFAULT 'NONE'
                    CHECK (internship_status IN ('NONE','APPLIED','SELECTED','IN_PROGRESS','COMPLETED')),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, semester)
);

CREATE INDEX IF NOT EXISTS idx_student_academic_plans_student
  ON public.student_academic_plans (student_id);

ALTER TABLE public.student_academic_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='student_academic_plans' AND policyname='svc_all_student_academic_plans'
  ) THEN
    CREATE POLICY svc_all_student_academic_plans ON public.student_academic_plans
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='student_academic_plans' AND policyname='student_own_academic_plans'
  ) THEN
    CREATE POLICY student_own_academic_plans ON public.student_academic_plans
      FOR ALL TO gate_app USING (student_id = current_setting('app.current_user_id', true)::uuid);
  END IF;
END $$;

COMMIT;
