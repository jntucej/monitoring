-- ============================================================================
-- Migration: Gate App Enrollment & Roles Grants
-- Purpose: Ensure gate_app has RLS policies and privileges for
--          enrollment_codes and user_roles so the web/worker roles
--          can insert and update bootstrap codes without RLS rejections.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gate_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollment_codes TO gate_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO gate_app;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='enrollment_codes'
        AND policyname='enrollment_codes_gate_app_all'
    ) THEN
      CREATE POLICY "enrollment_codes_gate_app_all" ON public.enrollment_codes
        FOR ALL TO gate_app USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='user_roles'
        AND policyname='user_roles_gate_app_all'
    ) THEN
      CREATE POLICY "user_roles_gate_app_all" ON public.user_roles
        FOR ALL TO gate_app USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;

COMMIT;
