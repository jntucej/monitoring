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

-- Record this migration as applied (idempotent)
INSERT INTO public.schema_migrations (version)
VALUES ('20261028000000')
ON CONFLICT (version) DO NOTHING;
