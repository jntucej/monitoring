-- database/migrations/20261221000002_fix_warden_scope_null.sql
BEGIN;
DROP POLICY IF EXISTS sdetails_select_warden ON public.student_details;
CREATE POLICY sdetails_select_warden ON public.student_details
  FOR SELECT TO authenticated
  USING (
    public.is_warden(current_setting('app.current_user_id', true)::uuid)
    AND public.get_warden_hostel(current_setting('app.current_user_id', true)::uuid) IS NOT NULL
    AND hostel_block = public.get_warden_hostel(current_setting('app.current_user_id', true)::uuid)
  );
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
    VALUES ('20261221000002', '20261221000002_fix_warden_scope_null.sql', NOW(),
            md5('20261221000002_fix_warden_scope_null'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261221000002', '20261221000002_fix_warden_scope_null.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261221000002', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
COMMIT;
