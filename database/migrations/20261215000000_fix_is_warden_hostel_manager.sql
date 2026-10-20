-- database/migrations/20261215000000_fix_is_warden_hostel_manager.sql
-- Fix is_warden() security definer function to recognize 'hostel_manager'
-- (the role replacement for 'warden' per 20261125000001).

BEGIN;

CREATE OR REPLACE FUNCTION public.is_warden(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r TEXT;
BEGIN
  SELECT role INTO r FROM users WHERE id = user_id;
  RETURN r IN ('principal', 'warden', 'hostel_manager');
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$function$;

-- Record migration
DO $$
DECLARE
  has_filename BOOLEAN;
  has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schema_migrations'
      AND column_name = 'filename'
  ) INTO has_filename;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schema_migrations'
      AND column_name = 'checksum'
  ) INTO has_checksum;
  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('20261215000000', '20261215000000_fix_is_warden_hostel_manager.sql', NOW(),
            md5('20261215000000_fix_is_warden_hostel_manager'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261215000000', '20261215000000_fix_is_warden_hostel_manager.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261215000000', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END$$;

COMMIT;
