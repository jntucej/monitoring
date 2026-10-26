-- NOTE: No-op scaffolding migration (self-record insert only; no DDL).
-- ============================================================================
-- Migration: 20261012072619_mess_add_vendor_column
-- Purpose: TODO — one-line description of what this changes and why.
--
-- Fixes audit issue #45: every ADD CONSTRAINT / CREATE INDEX is idempotent,
-- so re-running this migration (e.g. in a scratch DB or after a partial
-- failure) never errors.
--
-- Fixes audit issue #44: this migration does NOT touch the audit_logs_action_known
-- constraint. If you need a new audit action, edit
-- 20261027000000_audit_action_canonical.sql instead — that file is the single
-- owner.
-- ============================================================================

SET lock_timeout = '5s';
SET statement_timeout = '60s';

BEGIN;

-- ── 1. Example table change (rename to your actual change) ──────────────────
-- CREATE TABLE IF NOT EXISTS public.mess_add_vendor_column (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );

-- ── 2. Idempotent column adds ───────────────────────────────────────────────
-- ALTER TABLE public.mess_add_vendor_column
--   ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- ── 3. Idempotent constraint adds (guard with pg_constraint) ────────────────
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_constraint WHERE conname = 'mess_add_vendor_column_status_check'
--   ) THEN
--     ALTER TABLE public.mess_add_vendor_column
--       ADD CONSTRAINT mess_add_vendor_column_status_check
--       CHECK (status IN ('ACTIVE','ARCHIVED'));
--   END IF;
-- END $$;

-- ── 4. Idempotent index adds ────────────────────────────────────────────────
-- CREATE INDEX IF NOT EXISTS idx_mess_add_vendor_column_created_at
--   ON public.mess_add_vendor_column(created_at DESC);

-- ── 5. RLS (create policy only if missing) ──────────────────────────────────
-- ALTER TABLE public.mess_add_vendor_column ENABLE ROW LEVEL SECURITY;
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_policies
--     WHERE schemaname='public' AND tablename='mess_add_vendor_column'
--       AND policyname='svc_all_mess_add_vendor_column'
--   ) THEN
--     CREATE POLICY svc_all_mess_add_vendor_column
--       ON public.mess_add_vendor_column FOR ALL TO service_role
--       USING (true) WITH CHECK (true);
--   END IF;
-- END $$;

COMMIT;

-- ── Self-record (adaptive to 2-col or 4-col schema_migrations) ──
DO $$
DECLARE
  has_filename BOOLEAN;
  has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations'
      AND column_name='filename'
  ) INTO has_filename;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations'
      AND column_name='checksum'
  ) INTO has_checksum;

  IF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261012072619', '20261012072619_mess_add_vendor_column.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261012072619', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
