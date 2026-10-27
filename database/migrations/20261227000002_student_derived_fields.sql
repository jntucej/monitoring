-- ============================================================================
-- Student derived fields: make course/branch pollution structurally impossible
--
-- Root cause (historical): bulk import and ad-hoc writes stored department
--   names (CSE / IT / …) in student_details.course and composite display
--   labels in student_details.branch. The UI re-derives both from the roll
--   at render time, so the DB columns have been lying to every other reader
--   (exports, reports, /api/students/[roll], the scan/permission paths).
--
-- Design: enforce the correct values at the DB layer so NO application code
--   (future import paths, seed scripts, psql, admin edits) can write a wrong
--   value, by construction.
--
--   Layer 1 — mtech_specializations: institutional data, not code. The exam
--     branch can add/retire an M.Tech programme with a plain INSERT, no
--     deploy. Seeded from the codes rollNumber.ts already knows about.
--   Layer 2 — derive_programme(roll) / derive_branch(roll): the single SQL
--     source of truth. IMMUTABLE so they are usable anywhere.
--   Layer 3 — BEFORE INSERT/UPDATE trigger that rewrites course/branch from
--     the roll (or the *_override escape-hatch columns) on every write.
--     A `UPDATE … SET course='CSE'` simply cannot stick.
--   Layer 4 — CHECK on roll format (added NOT VALID so the handful of
--     unparseable legacy rows still load; VALIDATE after cleanup).
--   Layer 5 — one-shot backfill that rewrites every row with the same
--     functions the trigger uses, so DB and trigger agree by construction.
--
-- B.Tech dept codes: 02=EEE 03=ME 04=ECE 05=CSE 12=IT (rollNumber.ts).
-- M.Tech spec codes seeded from ROLL_DEPT_CODES (06,07,58,95,A3) — verify
-- against the exam-branch list; the table is the place to correct them.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. mtech_specializations — the programme list, as data
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mtech_specializations (
  code        TEXT PRIMARY KEY,           -- 2-char roll slot 7-8, e.g. '58'
  label       TEXT NOT NULL,              -- short name, e.g. 'CSE'
  full_label  TEXT,                       -- longer display label, optional
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed from the codes the TS parser already treats as M.Tech.
INSERT INTO public.mtech_specializations (code, label, full_label) VALUES
  ('06', 'DSCE', 'Data Science & AI (M.Tech)'),
  ('07', 'EPS',  'Electrical & Power Systems (M.Tech)'),
  ('58', 'CSE',  'Computer Science & Engineering (M.Tech)'),
  ('95', 'ED',   'Electrical (M.Tech)'),
  ('A3', 'CYS',  'Cyber Security (M.Tech)')
ON CONFLICT (code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_mtech_specs_active
  ON public.mtech_specializations (is_active, code);

ALTER TABLE public.mtech_specializations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='mtech_specializations'
      AND policyname='mtech_specs_service_all'
  ) THEN
    CREATE POLICY "mtech_specs_service_all" ON public.mtech_specializations
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='mtech_specializations'
      AND policyname='mtech_specs_select_active'
  ) THEN
    CREATE POLICY "mtech_specs_select_active" ON public.mtech_specializations
      FOR SELECT TO authenticated, postgres
      USING (is_active = TRUE);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gate_app') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='mtech_specializations'
        AND policyname='mtech_specs_gate_app'
    ) THEN
      CREATE POLICY "mtech_specs_gate_app" ON public.mtech_specializations
        FOR ALL TO gate_app USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Derivation functions (single SQL source of truth)
-- ----------------------------------------------------------------------------

-- Programme: entry mode 1D -> M.Tech, 1A/5A -> B.Tech, anything else -> NULL.
-- Case-insensitive on the college letters; entry code is what matters.
CREATE OR REPLACE FUNCTION public.derive_programme(p_roll TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN upper(p_roll) ~ '^[0-9]{2}[A-Z]{2}1D[0-9A-Z]{4}$' THEN 'M.Tech'
    WHEN upper(p_roll) ~ '^[0-9]{2}[A-Z]{2}(1A|5A)[0-9A-Z]{4}$' THEN 'B.Tech'
    ELSE NULL
  END
$$;

-- Branch / department: B.Tech uses the fixed 5-code table; M.Tech looks the
-- specialization code up in mtech_specializations (data, not code). Unknown
-- code -> NULL, never a guessed 'CSE'.
CREATE OR REPLACE FUNCTION public.derive_branch(p_roll TEXT)
RETURNS TEXT
LANGUAGE sql STABLE PARALLEL SAFE
AS $$
  WITH parts AS (
    SELECT substring(upper(p_roll) FROM 7 FOR 2) AS dept_code
  )
  SELECT CASE
    WHEN p_roll ~* '^[0-9]{2}[A-Za-z]{2}(1A|5A)[0-9A-Za-z]{4}$' THEN
      CASE (SELECT dept_code FROM parts)
        WHEN '02' THEN 'EEE'
        WHEN '03' THEN 'ME'
        WHEN '04' THEN 'ECE'
        WHEN '05' THEN 'CSE'
        WHEN '12' THEN 'IT'
        ELSE NULL
      END
    WHEN p_roll ~* '^[0-9]{2}[A-Za-z]{2}1D[0-9A-Za-z]{4}$' THEN
      (SELECT label FROM public.mtech_specializations
       WHERE code = (SELECT dept_code FROM parts) AND is_active
       LIMIT 1)
    ELSE NULL
  END
$$;

-- ----------------------------------------------------------------------------
-- 3. Override escape-hatch columns
--    For the ~1% of rows whose roll itself is wrong (transfer-in, data-entry
--    error the admin cannot fix by editing the roll). When set, the trigger
--    honors them; otherwise it derives from the roll.
-- ----------------------------------------------------------------------------
ALTER TABLE public.student_details
  ADD COLUMN IF NOT EXISTS course_override TEXT,
  ADD COLUMN IF NOT EXISTS branch_override  TEXT;

COMMENT ON COLUMN public.student_details.course_override IS
  'When set, overrides derive_programme(roll). Escape hatch for wrong rolls.';
COMMENT ON COLUMN public.student_details.branch_override IS
  'When set, overrides derive_branch(roll). Escape hatch for wrong rolls.';

-- ----------------------------------------------------------------------------
-- 4. Trigger: enforce derived course/branch on every write
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_student_derived_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.course := COALESCE(NULLIF(NEW.course_override, ''),
                         public.derive_programme(NEW.roll));
  NEW.branch := COALESCE(NULLIF(NEW.branch_override, ''),
                         public.derive_branch(NEW.roll));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_student_derived ON public.student_details;
CREATE TRIGGER trg_sync_student_derived
  BEFORE INSERT OR UPDATE OF roll, course_override, branch_override
  ON public.student_details
  FOR EACH ROW EXECUTE FUNCTION public.sync_student_derived_fields();

COMMENT ON FUNCTION public.sync_student_derived_fields() IS
  'Rewrites student_details.course/branch from roll (+override cols) on every '
  'INSERT/UPDATE so wrong values can never persist. See '
  '20261227000002_student_derived_fields.sql.';

-- ----------------------------------------------------------------------------
-- 5. Roll format CHECK — NOT VALID so legacy unparseable rows still load.
--    After cleaning them up, run:
--      ALTER TABLE public.student_details VALIDATE CONSTRAINT student_details_roll_format_check;
-- ----------------------------------------------------------------------------
ALTER TABLE public.student_details
  DROP CONSTRAINT IF EXISTS student_details_roll_format_check;
ALTER TABLE public.student_details
  ADD CONSTRAINT student_details_roll_format_check
  CHECK (roll IS NULL
         OR roll ~* '^[0-9]{2}[A-Za-z]{2}(1A|5A|1D|1S)[0-9A-Za-z]{4}$')
  NOT VALID;

-- ----------------------------------------------------------------------------
-- 6. One-shot backfill — rewrite course/branch on every row using the same
--    functions the trigger uses. Only rows that actually change are touched,
--    so re-running is a no-op.
-- ----------------------------------------------------------------------------
UPDATE public.student_details
   SET course       = COALESCE(NULLIF(course_override, ''),
                               public.derive_programme(roll)),
       branch       = COALESCE(NULLIF(branch_override, ''),
                               public.derive_branch(roll)),
       roll         = roll;

-- Touch course_override so the UPDATE OF course_override trigger fires on
-- every row and re-asserts the derived course/branch values (now that the
-- CHECK constraint has validated the rolls in-flight). Idempotent.
UPDATE public.student_details SET course_override = course_override;

DO $$
DECLARE n_unparsed INT;
BEGIN
  SELECT COUNT(*) INTO n_unparsed
    FROM public.student_details
   WHERE roll IS NOT NULL
     AND roll !~ '^[0-9]{2}[A-Za-z]{2}(1A|5A|1D|1S)[0-9A-Za-z]{4}$';
  IF n_unparsed > 0 THEN
    RAISE NOTICE
      'backfill: % student_details rows have unparseable rolls — left untouched '
      '(course/branch derived as NULL). Fix the rolls manually or set '
      'course_override/branch_override, then re-run this migration.',
      n_unparsed;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Grants (mirror the repo convention: service/app roles + gate_app)
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mtech_specializations
  TO postgres, authenticated, service_role;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gate_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.mtech_specializations TO gate_app;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Record migration in schema_migrations
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='schema_migrations') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='schema_migrations'
                 AND column_name='filename')
       AND EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='schema_migrations'
                 AND column_name='checksum') THEN
      INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
      VALUES ('20261227000002', '20261227000002_student_derived_fields.sql', NOW(),
              md5('20261227000002_student_derived_fields'))
      ON CONFLICT (version) DO NOTHING;
    ELSE
      INSERT INTO public.schema_migrations (version)
      VALUES ('20261227000002')
      ON CONFLICT (version) DO NOTHING;
    END IF;
  END IF;
END $$;

COMMIT;
