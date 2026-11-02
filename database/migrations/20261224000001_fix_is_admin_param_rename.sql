-- ============================================================================
-- Migration: 20261224000001_fix_is_admin_param_rename
-- Purpose: Re-create is_admin with a stable parameter name. The live DB has
--   is_admin(p_uid uuid) from 20260916000000; CREATE OR REPLACE cannot rename
--   a parameter (Postgres rejects "cannot change name of input parameter"),
--   so we DROP FUNCTION (without CASCADE — see note below) then CREATE.
--   CRITICAL: Never use CASCADE here — it drops every RLS policy that
--   references is_admin (users_select_admin, gates_select_admin,
--   sdetails_manage_admin, predictions, audit_logs, etc.) and those policies
--   are never recreated.
-- ============================================================================
-- Drop the old signature (parameter p_uid) without CASCADE so RLS policies
-- that reference is_admin are preserved (they keep working — the function
-- body is identical, only the parameter name changes, and parameter names
-- are not part of a policy's dependency chain).
DROP FUNCTION IF EXISTS public.is_admin(uuid);
CREATE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND role IN ('admin', 'sysadmin')
  );
$$;

-- Self-record (adaptive to 2-col or 4-col schema_migrations)
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
