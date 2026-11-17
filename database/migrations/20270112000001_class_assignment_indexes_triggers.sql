-- 20270112000001: Index + trigger normalization for class assignment queries.
--
-- Adds composite indexes for the "how many students in a class" and
-- "what's assigned to this faculty" patterns that bot commands and the
-- sysadmin dashboard will hit once class data is populated.
-- Also adds an updated_at trigger to classes/subjects and a
-- student_count materialized trigger on faculty_assignments so that
-- the "class member count" query is O(1) instead of a COUNT(*).

BEGIN;

-- ── 1. Indexes ─────────────────────────────────────────────────────────

-- Class enrollment lookup: count students by (department, year, section)
CREATE INDEX IF NOT EXISTS idx_sdetails_class_enrollment
  ON public.student_details (department, year, section)
  WHERE user_id IS NOT NULL;

-- Class lookup by teacher (partial, active only)
CREATE INDEX IF NOT EXISTS idx_classes_teacher_active
  ON public.classes (class_teacher_id)
  WHERE is_active;

-- Faculty → classes: which classes this faculty teaches
CREATE INDEX IF NOT EXISTS idx_fa_faculty_subject_active
  ON public.faculty_assignments (faculty_id, subject_code)
  WHERE is_active;

-- Class → subjects: what subjects are in this class
CREATE INDEX IF NOT EXISTS idx_subjects_department_active
  ON public.subjects (department_id)
  WHERE is_active;

-- ── 2. class_student_counts materialized counter ───────────────────────
-- A maintained counter table so "how many students in this class" is a
-- point lookup, not a COUNT(*) over student_details.
--
-- Schema: (class_key TEXT, student_count INT, updated_at TIMESTAMPTZ)
-- class_key = '<department>:<year>:<section>'

CREATE TABLE IF NOT EXISTS public.class_student_counts (
  class_key     TEXT        NOT NULL,
  department    TEXT        NOT NULL,
  year          INTEGER     NOT NULL,
  section       VARCHAR(5)  NOT NULL,
  student_count INTEGER     NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (class_key)
);

CREATE OR REPLACE FUNCTION public.fn_maintain_class_student_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF (TG_OP = 'UPDATE'
        AND (OLD.department, OLD.year, OLD.section) IS NOT DISTINCT FROM (NEW.department, NEW.year, NEW.section)) THEN
      -- No class change on UPDATE: return without touching the counter
      RETURN COALESCE(NEW, OLD);
    END IF;

    INSERT INTO public.class_student_counts
      (class_key, department, year, section, student_count, updated_at)
    VALUES
      (NEW.department || ':' || NEW.year || ':' || NEW.section,
       NEW.department, NEW.year, NEW.section,
       CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE 0 END,
       now())
    ON CONFLICT (class_key) DO UPDATE SET
      student_count = public.class_student_counts.student_count
        + CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE 0 END,
      updated_at    = now();
  END IF;

  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    UPDATE public.class_student_counts
       SET student_count = GREATEST(
             student_count - CASE WHEN TG_OP = 'DELETE' THEN 1 ELSE 0 END, 0),
           updated_at    = now()
     WHERE class_key =
       COALESCE(
         CASE WHEN TG_OP = 'DELETE'
           THEN OLD.department || ':' || OLD.year || ':' || OLD.section
           ELSE NULL
         END,
         CASE WHEN TG_OP = 'UPDATE'
              AND (OLD.department, OLD.year, OLD.section) IS DISTINCT FROM
                  (NEW.department, NEW.year, NEW.section)
           THEN OLD.department || ':' || OLD.year || ':' || OLD.section
           ELSE NULL
         END
       );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop the old trigger first (idempotent), then recreate with the fixed logic.
DROP TRIGGER IF EXISTS trg_class_student_count ON public.student_details;
CREATE TRIGGER trg_class_student_count
  AFTER INSERT OR UPDATE OR DELETE ON public.student_details
  FOR EACH ROW EXECUTE FUNCTION public.fn_maintain_class_student_count();

-- ── 3. updated_at triggers on classes / subjects ───────────────────────

CREATE OR REPLACE FUNCTION public.fn_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- classes already has trg_classes_updated_at; check it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'classes' AND t.tgname = 'trg_classes_updated_at'
  ) THEN
    CREATE TRIGGER trg_classes_updated_at
      BEFORE UPDATE ON public.classes
      FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at();
  END IF;
END;
$$;

-- subjects: add updated_at if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subjects' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.subjects ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'subjects' AND t.tgname = 'trg_subjects_updated_at'
  ) THEN
    CREATE TRIGGER trg_subjects_updated_at
      BEFORE UPDATE ON public.subjects
      FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at();
  END IF;
END;
$$;

-- ── 4. RLS for class_student_counts ────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'class_student_counts'
      AND c.relrowsecurity
  ) THEN
    ALTER TABLE public.class_student_counts ENABLE ROW LEVEL SECURITY;
  END IF;

  -- All app roles can read; only sysadmin/admin can write
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'class_student_counts'
      AND policyname = 'class_student_counts_app_read'
  ) THEN
    CREATE POLICY class_student_counts_app_read ON public.class_student_counts
      FOR SELECT TO gate_app, admin, authenticated;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'class_student_counts'
      AND policyname = 'class_student_counts_admin_write'
  ) THEN
    CREATE POLICY class_student_counts_admin_write ON public.class_student_counts
      FOR ALL TO admin, postgres
      USING (true);
  END IF;
END;
$$;

-- ── 5. Backfill from existing student_details ─────────────────────────

INSERT INTO public.class_student_counts (class_key, department, year, section, student_count, updated_at)
SELECT
  department || ':' || year || ':' || section,
  department,
  year,
  section,
  COUNT(*),
  now()
FROM public.student_details
WHERE department IS NOT NULL
  AND year IS NOT NULL
  AND section IS NOT NULL
GROUP BY department, year, section
ON CONFLICT (class_key) DO UPDATE SET
  student_count = EXCLUDED.student_count,
  updated_at    = now();

COMMIT;
