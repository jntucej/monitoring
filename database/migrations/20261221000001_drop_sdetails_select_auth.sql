-- database/migrations/20261221000001_drop_sdetails_select_auth.sql
BEGIN;
DROP POLICY IF EXISTS sdetails_select_auth ON public.student_details;
-- safety: refuse to run if the scoped policies were removed elsewhere
DO $$BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='student_details'
      AND policyname='sdetails_select_owner'
  ) THEN
    RAISE EXCEPTION 'sdetails_select_owner missing — refusing to remove the permissive policy';
  END IF;
END $$;
DO $$DECLARE has_filename BOOLEAN; has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations' AND column_name='filename')
    INTO has_filename;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations' AND column_name='checksum')
    INTO has_checksum;
  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('20261221000001', '20261221000001_drop_sdetails_select_auth.sql', NOW(),
            md5('20261221000001_drop_sdetails_select_auth'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261221000001', '20261221000001_drop_sdetails_select_auth.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261221000001', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
COMMIT;
