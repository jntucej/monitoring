-- Add date-of-birth + student detail fields that the bulk user-import writes.
-- Without these, every import row fails: the users insert includes `dob`
-- (NOT a silent skip — it throws, so failedCount = totalRows), and the
-- student_details upsert includes course / father_name / landline_number.
-- Idempotent: safe to re-run.

-- users.dob — date of birth
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS dob date;

-- student_details: course, father's name, landline/parent contact number
ALTER TABLE public.student_details
  ADD COLUMN IF NOT EXISTS course text,
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS landline_number text;

-- Record this migration. The tracking table has two shapes across the system:
--   * production gate_monitor : (version PK, applied_at)                      -> 2 cols
--   * checker/migrate.ts/CI   : (version PK, filename NOT NULL,
--                                applied_at, checksum NOT NULL)               -> 4 cols
-- A version-only INSERT is correct for the 2-col table but violates the
-- filename NOT NULL constraint in the 4-col variant, so detect the columns
-- and insert accordingly. Idempotent via ON CONFLICT (version).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name   = 'schema_migrations'
               AND column_name  = 'filename') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public'
                 AND table_name   = 'schema_migrations'
                 AND column_name  = 'checksum') THEN
      INSERT INTO public.schema_migrations (version, filename, checksum)
      VALUES ('20261028000000',
              '20261028000000_add_dob_and_student_extra_columns.sql',
              'replayed')
      ON CONFLICT (version) DO NOTHING;
    ELSE
      INSERT INTO public.schema_migrations (version, filename)
      VALUES ('20261028000000',
              '20261028000000_add_dob_and_student_extra_columns.sql')
      ON CONFLICT (version) DO NOTHING;
    END IF;
  ELSE
    INSERT INTO public.schema_migrations (version)
    VALUES ('20261028000000')
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
