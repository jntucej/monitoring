-- ============================================================================
-- Migration: Least-privilege gate_app grants for enrollment_codes/user_roles
--
-- Purpose: The 20261231000005_enforce_nobypassrls migration granted
--          gate_app full table privileges on every public table, including
--          DELETE/TRUNCATE/REFERENCES/TRIGGER on enrollment_codes and
--          user_roles. The scoped RLS migration (20261231000010) only needs
--          SELECT/INSERT/UPDATE. This migration trims gate_app down to the
--          minimum privileges the app actually uses.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gate_app') THEN

    -- Revoke privileges the app does not use on these sensitive tables.
    REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.enrollment_codes FROM gate_app;
    REVOKE DELETE ON public.enrollment_codes FROM gate_app;

    REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.user_roles FROM gate_app;
    REVOKE DELETE ON public.user_roles FROM gate_app;

    -- Break the RLS bridge: gate_app must not inherit service_role policies
    -- (service_role carries BYPASSRLS in older layouts, and even without it
    -- the service_role_all_enrollment_codes policy would let gate_app read
    -- every enrollment code without setting app.current_role).
    REVOKE service_role FROM gate_app;

    -- Drop the broad permissive policies left by earlier migrations.
    DROP POLICY IF EXISTS "enrollment_codes_gate_app_all" ON public.enrollment_codes;
    DROP POLICY IF EXISTS "user_roles_gate_app_all" ON public.user_roles;
  END IF;
END $$;

COMMIT;
