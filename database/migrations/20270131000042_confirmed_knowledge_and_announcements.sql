-- 20270131000042_confirmed_knowledge_and_announcements.sql
-- Constraint-scoped confirmed knowledge + "also applies to" tagging on doubts.
BEGIN;

CREATE TABLE IF NOT EXISTS public.confirmed_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_pattern TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  topic TEXT NOT NULL CHECK (topic IN ('academic', 'timetable', 'exam', 'hostel', 'curfew', 'campus', 'policy')),
  class_id TEXT,
  subject_code TEXT,
  department_id TEXT,
  batch_year TEXT,
  regulation TEXT,
  persona TEXT NOT NULL DEFAULT 'all' CHECK (persona IN ('all', 'hosteller', 'day_scholar')),
  condition_note TEXT,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  also_applies_to TEXT[] NOT NULL DEFAULT '{}',
  confirmed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  confirmed_by_role TEXT NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'faculty_confirmation'
    CHECK (source_kind IN ('faculty_confirmation', 'verified_qa', 'circular', 'timetable_rule')),
  source_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_confirmed_knowledge_scope
  ON public.confirmed_knowledge (topic, class_id, subject_code, created_at DESC);

ALTER TABLE public.class_doubt_escalations
  ADD COLUMN IF NOT EXISTS also_applies_to TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS subject_code TEXT;

ALTER TABLE public.confirmed_knowledge ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'confirmed_knowledge' AND policyname = 'confirmed_knowledge_read_all'
  ) THEN
    CREATE POLICY confirmed_knowledge_read_all ON public.confirmed_knowledge
      FOR SELECT USING (TRUE);
  END IF;
END $$;

COMMIT;
