-- Expand the enrollment_codes.purpose CHECK constraint to allow the full set
-- of purposes the application actually issues:
--   mobile         -> gate/kiosk mobile login
--   web_bootstrap  -> first-time web onboarding (password + PIN)
--   pin_reset      -> kiosk PIN reset
-- The existing constraint only allowed ('mobile','web'), which made the
-- sysadmin "reset password / issue enrollment code" flow fail with:
--   new row for relation "enrollment_codes" violates check constraint
--   "enrollment_codes_purpose_check"
-- Idempotent: recreates the constraint only if the current definition is missing
-- the new purposes.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'enrollment_codes_purpose_check'
      AND pg_get_constraintdef(oid) LIKE '%web_bootstrap%'
  ) THEN
    ALTER TABLE public.enrollment_codes
      DROP CONSTRAINT IF EXISTS enrollment_codes_purpose_check;

    ALTER TABLE public.enrollment_codes
      ADD CONSTRAINT enrollment_codes_purpose_check
      CHECK (purpose = ANY (ARRAY['mobile'::text, 'web'::text, 'web_bootstrap'::text, 'pin_reset'::text]));
  END IF;
END
$$;

-- Self-record: adaptive to both 2-column (prod) and 4-column (checker) shapes.
DO $$
DECLARE
  has_filename BOOLEAN;
  has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='schema_migrations' AND column_name='filename')
  INTO has_filename;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='schema_migrations' AND column_name='checksum')
  INTO has_checksum;

  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('20261030000000', '20261030000000_enrollment_purpose_check.sql', NOW(),
            md5('20261030000000_enrollment_purpose_check'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261030000000', '20261030000000_enrollment_purpose_check.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261030000000', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END
$$;
