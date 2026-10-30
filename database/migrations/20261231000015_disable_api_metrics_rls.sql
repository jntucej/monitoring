-- Migration: 20261231000015_disable_api_metrics_rls.sql
--
-- api_metrics is a server-side telemetry table written by the web/worker
-- process via the gate_app connection. It is read back through the same
-- gate_app connection (health checkers, UEBA views, admin dashboards).
-- RLS is enabled on the table but there are NO policies, and the table
-- owner does not bypass RLS, so every INSERT (and every re-check) fails
-- with "new row violates row-level security policy for table api_metrics".
--
-- The fix: keep RLS enabled (defense in depth against the untrusted
-- `authenticated` role) but stop forcing it on the table owner so
-- server-side writes succeed. Add an explicit permissive policy for
-- service_role (the backfill / reporting path) and for gate_app so the
-- intended write/read paths are always granted, while the anon role is
-- denied (no policy applies to it).
BEGIN;

ALTER TABLE public.api_metrics OWNER TO postgres;
ALTER TABLE public.api_metrics NO FORCE ROW LEVEL SECURITY;

-- gate_app (application role): insert + read its own telemetry
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'api_metrics'
      AND policyname = 'api_metrics_gate_app_all'
  ) THEN
    CREATE POLICY "api_metrics_gate_app_all" ON public.api_metrics
      FOR ALL TO gate_app USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'api_metrics'
      AND policyname = 'api_metrics_service_role_all'
  ) THEN
    CREATE POLICY "api_metrics_service_role_all" ON public.api_metrics
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMIT;
