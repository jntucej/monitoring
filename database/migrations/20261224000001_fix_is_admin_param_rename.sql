-- ============================================================================
-- Migration: 20261224000001_fix_is_admin_param_rename
-- Purpose: Re-create is_admin with the p_uid param name. The live DB has
--   is_admin(user_id) from an older baseline; 20261010000000_role_registry
--   redefines it as is_admin(p_uid). On a DB where the old function still
--   exists, the CREATE OR REPLACE fails on the param-name change. This
--   migration drops the old function (by arg type, not name) and re-creates
--   it, so the chain can proceed. Idempotent: safe to run twice.
-- ============================================================================
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.is_admin(p_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_uid AND role IN ('admin', 'sysadmin')
  );
$$;

-- Self-record
DO $$
DECLARE
  has_filename BOOLEAN;
  has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schema_migrations'
      AND column_name = 'filename') INTO has_filename;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schema_migrations'
      AND column_name = 'checksum') INTO has_checksum;
  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('20261224000001',
            '20261224000001_fix_is_admin_param_rename.sql', NOW(),
            md5('20261224000001_fix_is_admin_param_rename'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261224000001',
            '20261224000001_fix_is_admin_param_rename.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261224000001', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
