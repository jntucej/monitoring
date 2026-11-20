-- 20270112000000_sentinel_surfaced_fixes.sql
-- Fifth ops commit: sentinel-surfaced silent failures.
--
-- 1. audit_logs is RLS-enabled (schema.sql line 812) and the app writes it
--    as gate_app (SET ROLE gate_app in src/lib/postgres.ts). The read-set
--    migration (20270101000013) never included audit_logs, so gate_app has
--    NO policy at all: every auditWrite() INSERT is silently filtered to
--    zero rows (RLS default deny), and admin audit-log reads as gate_app
--    return empty. This migration adds the FOR INSERT and FOR SELECT
--    policies.
-- 2. The security-hardening REVOKE (UPDATE/DELETE from gate_app on
--    audit_logs) was never actually issued — 20261223000001 only revoked
--    it from authenticated/service_role/postgres. Re-issue it now so the
--    immutability guarantee rests on grants, not the trigger alone.
-- 3. Flag synthetic sustainability seed rows (paperless × 0.4) so the UI
--    can label them instead of presenting fabricated data as real.
BEGIN;

-- ── 1. audit_logs: restore gate_app write + read under RLS ───────────────
GRANT INSERT, SELECT ON public.audit_logs TO gate_app;
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM gate_app;

DROP POLICY IF EXISTS audit_logs_gate_app_insert ON public.audit_logs;
CREATE POLICY audit_logs_gate_app_insert ON public.audit_logs
  FOR INSERT TO gate_app WITH CHECK (true);

DROP POLICY IF EXISTS audit_logs_gate_app_select ON public.audit_logs;
CREATE POLICY audit_logs_gate_app_select ON public.audit_logs
  FOR SELECT TO gate_app USING (true);

-- ── 2. sustainability seed: flag synthetic rows ──────────────────────────
ALTER TABLE public.sustainability_metrics
  ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.sustainability_metrics
   SET is_synthetic = TRUE
 WHERE carbon_saved_kg = paperless_passes_count * 0.4
   AND is_synthetic = FALSE;

COMMIT;
