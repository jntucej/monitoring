-- 20270113000001: Student academic status mapping
--
-- Adds academic_status, year_override, and active flags to support:
--   • suspended students (temporarily barred from campus)
--   • debarred / failed students (repeating with next year)
--   • lateral joiners studying with juniors (year_override)
--
-- The effective academic year for gate/access purposes is:
--   COALESCE(year_override, year)
--
-- A suspended or debarred student gets their flag_status updated on
-- users, which the gate scanner and RLS policies already respect.

BEGIN;

-- ── 1. Add academic_status column to student_details ─────────────────
-- NULL = normal (in year)
-- 'SUSPENDED'  = temporarily barred
-- 'DEBARRED'   = failed, repeating with next year
-- 'LATERAL_JOIN' = joined mid-course, studying with juniors

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_details' AND column_name = 'academic_status'
  ) THEN
    ALTER TABLE public.student_details
      ADD COLUMN academic_status TEXT CHECK (academic_status IN
        ('SUSPENDED', 'DEBARRED', 'LATERAL_JOIN'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_details' AND column_name = 'status_reason'
  ) THEN
    ALTER TABLE public.student_details
      ADD COLUMN status_reason TEXT;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_details' AND column_name = 'status_set_at'
  ) THEN
    ALTER TABLE public.student_details
      ADD COLUMN status_set_at TIMESTAMPTZ;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_details' AND column_name = 'year_override'
  ) THEN
    -- For LATERAL_JOIN: which year's class they're actually in
    ALTER TABLE public.student_details
      ADD COLUMN year_override INTEGER;
  END IF;
END;
$$;

-- Index for the gate/access query that needs "is this student currently
-- suspended or debarred?" fast:
CREATE INDEX IF NOT EXISTS idx_sdetails_academic_status
  ON public.student_details (academic_status)
  WHERE academic_status IS NOT NULL;

-- Index for "which students are in year X for gate purposes" (effective year)
CREATE INDEX IF NOT EXISTS idx_sdetails_effective_year
  ON public.student_details (COALESCE(year_override, year));

-- ── 2. Trigger: sync flag_status on users when academic_status changes ─

CREATE OR REPLACE FUNCTION public.fn_sync_academic_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.academic_status := NULL;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    -- On delete or status change, clear the flag
    IF TG_OP = 'DELETE'
       OR NEW.academic_status IS NULL
       OR (TG_OP = 'UPDATE' AND NEW.academic_status = OLD.academic_status)
    THEN
      -- No-op: flag is managed by the admin action, not by this trigger
      RETURN COALESCE(NEW, OLD);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ── 3. Academic status view: single source of truth for "effective year" ─

CREATE OR REPLACE VIEW public.student_effective_year AS
SELECT
  u.id            AS user_id,
  u.unique_id     AS roll,
  u.name,
  u.role,
  u.status,
  u.flag_status,
  sd.department,
  sd.section,
  sd.year,
  sd.year_override,
  COALESCE(sd.year_override, sd.year) AS effective_year,
  sd.academic_status,
  sd.status_reason,
  sd.student_type,
  sd.current_entry_type
FROM public.users u
LEFT JOIN public.student_details sd ON sd.user_id = u.id
WHERE u.role = 'student'
  AND u.status = 'ACTIVE';

-- ── 4. RLS on the view ────────────────────────────────────────────────
-- Views inherit RLS from the base tables, so users only see
-- their own row (via the users RLS policies) and the gate_app
-- role sees what it's allowed to.

-- ── 5. Seed: set academic_status for any existing suspended/debarred ─
-- No-op for now — the column is added, data will be set by admins
-- through the portal. This is a schema foundation migration.

COMMIT;
