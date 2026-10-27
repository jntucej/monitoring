-- ============================================================================
-- Migration: 20261125000000_kiosk_session_hardening
-- Purpose:   Bump users.session_version when an operator's gate_id changes,
--            so kiosk JWTs (which carry the session_version claim and are
--            cross-checked by authContext) are invalidated the moment the
--            operator's assigned gate moves. Without this, a kiosk session
--            issued for gate A stays valid even after the operator is
--            reassigned to gate B.
-- Idempotent: safe to re-run.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.bump_operator_session_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  IF NEW.role = 'operator' AND NEW.gate_id IS DISTINCT FROM OLD.gate_id THEN
    NEW.session_version := NEW.session_version + 1;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_bump_operator_session_version ON public.users;
CREATE TRIGGER trg_bump_operator_session_version
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.bump_operator_session_version();

COMMIT;

-- Self-record (adaptive to both schema_migrations shapes)
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
    VALUES ('20261125000000',
            '20261125000000_kiosk_session_hardening.sql', NOW(),
            md5('20261125000000_kiosk_session_hardening'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261125000000',
            '20261125000000_kiosk_session_hardening.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261125000000', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
