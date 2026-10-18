-- ============================================================================
-- Migration: 20261202000000_classes_and_faculty
-- Purpose: Introduce the classes + faculty system.
--
--   classes            – one row per (department, year, section) teaching group
--   faculty_assignments – many-to-many: faculty ↔ class, with role + subject
--   subjects            – per-department subject catalogue
--
-- Additive-only: every DDL is IF NOT EXISTS / ON CONFLICT DO NOTHING.
-- Idempotent: safe to re-run. No existing column/table is renamed or dropped.
--
-- Scope model (enforced in the API layer, see src/contracts/classes.ts):
--   hod      → caller.department_id = target.department_id
--   teacher  → classes.class_teacher_id = caller.id
--   assigned → EXISTS faculty_assignments(faculty_id=caller.id, class_id=…)
--   admin    → role IN ('admin','sysadmin')
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. classes — one row per (department, year, section)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.classes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id     TEXT NOT NULL,
  year              INTEGER NOT NULL,
  section           VARCHAR(5) NOT NULL,
  name              TEXT,
  class_teacher_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  room_number       VARCHAR(20),
  capacity          INTEGER,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (department_id, year, section)
);

CREATE INDEX IF NOT EXISTS idx_classes_department   ON public.classes(department_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher      ON public.classes(class_teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_active       ON public.classes(is_active) WHERE is_active;

COMMENT ON TABLE public.classes IS 'Teaching group: one row per (department, year, section).';

-- ----------------------------------------------------------------------------
-- 2. faculty_assignments — faculty ↔ class, with role + subject
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faculty_assignments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  class_id       UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_code   VARCHAR(10) NOT NULL,
  role           VARCHAR(20) NOT NULL
                 CHECK (role IN ('class_teacher','subject_faculty','assistant')),
  assigned_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (faculty_id, class_id, subject_code)
);

CREATE INDEX IF NOT EXISTS idx_fa_faculty ON public.faculty_assignments(faculty_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_fa_class   ON public.faculty_assignments(class_id)  WHERE is_active;

COMMENT ON TABLE public.faculty_assignments IS 'Faculty ↔ class assignment with role and subject code.';

-- ----------------------------------------------------------------------------
-- 3. subjects — per-department subject catalogue
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
  code           VARCHAR(10) PRIMARY KEY,
  label          TEXT NOT NULL,
  department_id  TEXT,
  color          VARCHAR(7) DEFAULT '#6366f1',
  sort_order     INTEGER NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE public.subjects IS 'Per-department subject catalogue (e.g. CSE101, MAT202).';

-- ----------------------------------------------------------------------------
-- 4. updated_at trigger (idempotent)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_classes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_classes_updated_at ON public.classes;
CREATE TRIGGER trg_classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.set_classes_updated_at();

COMMIT;
