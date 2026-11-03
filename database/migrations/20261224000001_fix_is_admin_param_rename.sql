-- ============================================================================
-- Migration: 20261224000001_fix_is_admin_param_rename
-- Purpose: Re-create is_admin with a STABLE parameter name. The live DB has
--   is_admin(p_uid uuid) from the baseline (25 RLS policies reference it by
--   name only — the parameter label is not pinned). CREATE OR REPLACE cannot
--   rename an existing input parameter, so we keep the `p_uid` name that the
--   baseline ships. No DROP needed; no CASCADE risk to RLS policies.
--   The function body is the same; the parameter name is cosmetic.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin(p_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_uid AND role IN ('admin', 'sysadmin')
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
