-- ============================================================================
-- Migration: 20261114000000_sentinel_gate_protection
-- Purpose:   Prevent deletion of the sentinel gate 00000000-0000-...-0000.
--            daily_stats.gate_id and movement_logs.gate_id FK to gates(id);
--            deleting the sentinel row would fail (RESTRICT) or orphan
--            historical analytics rows.
-- Idempotent: safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_sentinel_gate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  IF OLD.id = '00000000-0000-0000-0000-000000000000'::uuid THEN
    RAISE EXCEPTION
      'Sentinel gate 00000000-0000-0000-0000-000000000000 is system-owned and cannot be deleted';
  END IF;
  RETURN OLD;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_protect_sentinel_gate ON public.gates;
CREATE TRIGGER trg_protect_sentinel_gate
  BEFORE DELETE ON public.gates
  FOR EACH ROW EXECUTE FUNCTION public.protect_sentinel_gate();

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
    VALUES ('20261114000000',
            '20261114000000_sentinel_gate_protection.sql', NOW(),
            md5('20261114000000_sentinel_gate_protection'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261114000000',
            '20261114000000_sentinel_gate_protection.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261114000000', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
