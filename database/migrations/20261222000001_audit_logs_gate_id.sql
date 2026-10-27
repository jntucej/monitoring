-- database/migrations/20261222000001_audit_logs_gate_id.sql
--
-- audit_logs gained a gate_id column (added in 20261222000001 on the live
-- DB, and consumed by addAudit() in src/lib/db.ts which persists
-- entry.gateId). This migration backfills the column + index on any
-- schema that does not yet have it, so schema.sql / bootstrap replays
-- converge with the live DB.
--
-- Idempotent: every DDL uses IF NOT EXISTS.

BEGIN;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS gate_id UUID;

CREATE INDEX IF NOT EXISTS audit_logs_gate_id_idx
  ON public.audit_logs (gate_id)
  WHERE gate_id IS NOT NULL;

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
    SELECT '20261222000001', '20261222000001_audit_logs_gate_id.sql', NOW(),
           md5('20261222000001_audit_logs_gate_id')
    WHERE NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = '20261222000001');
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    SELECT '20261222000001', '20261222000001_audit_logs_gate_id.sql', NOW()
    WHERE NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = '20261222000001');
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    SELECT '20261222000001', NOW()
    WHERE NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = '20261222000001');
  END IF;
END $$;

COMMIT;
