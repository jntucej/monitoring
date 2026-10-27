-- ============================================================================
-- Migration: 20261228000000_drop_sso_subsystem
-- Purpose:   Remove the SSO/OIDC subsystem entirely. The login form no longer
--            offers SSO; the OAuth handler and admin config API are deleted.
--            Tables + columns are dropped so a stale `sso_config` row with a
--            placeholder client ID can never re-enable the broken flow.
--
-- SAFE TO RE-RUN: every DROP uses IF EXISTS.
--
-- NOTE on versioning: the request suggested 20261028000000, but that would
-- sort BEFORE the already-applied 20261226*/20261227* migrations and break
-- chronological replay. 20261228000000 is the next free slot after the
-- current highest version.
-- ============================================================================

BEGIN;

-- 1. Drop SSO authorization-state table (PKCE verifiers, nonces)
DROP TABLE IF EXISTS public.sso_authorization_states CASCADE;

-- 2. Drop SSO configuration table (provider, client_id, issuer_url, ...)
DROP TABLE IF EXISTS public.sso_config CASCADE;

-- 3. Drop the SSO provenance columns + their index on users
DROP INDEX IF EXISTS public.idx_users_sso_subject;
ALTER TABLE public.users
  DROP COLUMN IF EXISTS sso_provider,
  DROP COLUMN IF EXISTS sso_subject;

-- 4. Self-record (adaptive to the schema_migrations shape on this instance)
DO $$
DECLARE
  has_filename BOOLEAN;
  has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations'
      AND column_name='filename') INTO has_filename;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations'
      AND column_name='checksum') INTO has_checksum;
  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('20261228000000', '20261228000000_drop_sso_subsystem.sql', NOW(),
            md5('20261228000000_drop_sso_subsystem'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261228000000', '20261228000000_drop_sso_subsystem.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261228000000', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;

COMMIT;
