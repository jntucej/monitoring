-- ============================================================================
-- Migration: 20261114000001_users_handle_lower_index
-- Purpose:   20261025000001 added case-insensitive indexes for email,
--            login_identifier and unique_id, but missed `handle`.
--            findUserByLogin() ILIKEs handle on every login -> seq scan.
-- Idempotent: safe to re-run.
-- ============================================================================

CREATE INDEX IF NOT EXISTS users_handle_lower_key
  ON public.users (LOWER(handle))
  WHERE handle IS NOT NULL;

DO $$
DECLARE has_filename BOOLEAN; has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations'
      AND column_name='filename') INTO has_filename;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations'
      AND column_name='checksum') INTO has_checksum;
  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('20261114000001',
            '20261114000001_users_handle_lower_index.sql', NOW(),
            md5('20261114000001_users_handle_lower_index'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261114000001',
            '20261114000001_users_handle_lower_index.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261114000001', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
