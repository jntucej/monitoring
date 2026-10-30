-- ============================================================================
-- Migration: Scoped gate_app RLS policies for enrollment_codes and user_roles
--
-- Security model:
--   The application connects to Postgres as gate_app (NOBYPASSRLS). Role
--   checks happen in the Next.js middleware layer, but the database still
--   enforces RLS. We grant gate_app a narrowly scoped PERMISSIVE policy
--   that only allows access when the app sets a session variable
--   (app.current_role) to a trusted admin value. Because the current
--   implementation does NOT set this variable yet, access will fail closed
--   (denied) until the application is wired to set it in trusted code.
--
--   This avoids weakening RLS:
--     * Policies are explicitly TO gate_app (never PUBLIC).
--     * USING / WITH CHECK verify current_setting('app.current_role', true)
--       equals 'sysadmin' or 'admin'.
--     * If the variable is unset, the check fails closed.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gate_app') THEN

    -- -----------------------------------------------------------------
    -- enrollment_codes
    -- -----------------------------------------------------------------
    GRANT SELECT, INSERT, UPDATE ON public.enrollment_codes TO gate_app;

    DROP POLICY IF EXISTS "enrollment_codes_gate_app_select" ON public.enrollment_codes;
    CREATE POLICY "enrollment_codes_gate_app_select" ON public.enrollment_codes
      FOR SELECT TO gate_app
      USING (current_setting('app.current_role', true) IN ('sysadmin', 'admin'));

    DROP POLICY IF EXISTS "enrollment_codes_gate_app_insert" ON public.enrollment_codes;
    CREATE POLICY "enrollment_codes_gate_app_insert" ON public.enrollment_codes
      FOR INSERT TO gate_app
      WITH CHECK (current_setting('app.current_role', true) IN ('sysadmin', 'admin'));

    DROP POLICY IF EXISTS "enrollment_codes_gate_app_update" ON public.enrollment_codes;
    CREATE POLICY "enrollment_codes_gate_app_update" ON public.enrollment_codes
      FOR UPDATE TO gate_app
      USING (current_setting('app.current_role', true) IN ('sysadmin', 'admin'))
      WITH CHECK (current_setting('app.current_role', true) IN ('sysadmin', 'admin'));

    -- -----------------------------------------------------------------
    -- user_roles
    -- -----------------------------------------------------------------
    GRANT SELECT, INSERT, UPDATE ON public.user_roles TO gate_app;

    DROP POLICY IF EXISTS "user_roles_gate_app_select" ON public.user_roles;
    CREATE POLICY "user_roles_gate_app_select" ON public.user_roles
      FOR SELECT TO gate_app
      USING (current_setting('app.current_role', true) IN ('sysadmin', 'admin'));

    DROP POLICY IF EXISTS "user_roles_gate_app_insert" ON public.user_roles;
    CREATE POLICY "user_roles_gate_app_insert" ON public.user_roles
      FOR INSERT TO gate_app
      WITH CHECK (current_setting('app.current_role', true) IN ('sysadmin', 'admin'));

    DROP POLICY IF EXISTS "user_roles_gate_app_update" ON public.user_roles;
    CREATE POLICY "user_roles_gate_app_update" ON public.user_roles
      FOR UPDATE TO gate_app
      USING (current_setting('app.current_role', true) IN ('sysadmin', 'admin'))
      WITH CHECK (current_setting('app.current_role', true) IN ('sysadmin', 'admin'));
  END IF;
END $$;

COMMIT;
