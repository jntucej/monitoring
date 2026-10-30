-- 20261030000000_enrollment_purpose_check.sql
-- Restore 'web' as a valid enrollment purpose (used by the first-password
-- web enrollment flow; distinct from 'web_bootstrap'). If no code path emits
-- 'web', remove it here instead of leaving a dead security-sensitive value.
ALTER TABLE public.enrollment_codes
  DROP CONSTRAINT IF EXISTS enrollment_codes_purpose_check;
ALTER TABLE public.enrollment_codes
  ADD CONSTRAINT enrollment_codes_purpose_check
  CHECK (purpose = ANY (ARRAY[
    'mobile'::text,
    'web'::text,
    'web_bootstrap'::text,
    'pin_reset'::text,
    'role_bootstrap'::text
  ]));

DO $$DECLARE
  has_filename BOOLEAN;
  has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations' AND column_name='filename'
  ) INTO has_filename;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations' AND column_name='checksum'
  ) INTO has_checksum;
  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('20261030000000', '20261030000000_enrollment_purpose_check.sql', NOW(),
            md5('20261030000000_enrollment_purpose_check_v2'))
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
END$$;
