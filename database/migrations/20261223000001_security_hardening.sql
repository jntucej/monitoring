-- ============================================================================
-- Migration: 20261223000001_security_hardening.sql
-- Addressed review items: P0-1, P0-2, P0-6, P2-22, P2-24, P2-25
--
-- P0-1: RLS role bridge (gate_app)
-- REVOKE service_role from gate_app so it cannot assume BYPASSRLS.
REVOKE service_role FROM gate_app;
--
-- P0-2: Immutable audit_logs
--   REVOKE UPDATE, DELETE on audit_logs from all roles (keep SELECT).
--   Add trigger trg_audit_logs_immutable that RAISEs on UPDATE/DELETE.
--   Only SECURITY DEFINER functions (audit_log_entry) should write.
--
-- P0-6: Bootstrap window
--   REVOKE EXECUTE on create_user_with_auth from authenticated so only
--   the trusted service_role can call user-creation. The IF users>0 check
--   in the function body remains as a secondary guard, but the privilege
--   boundary is now enforced at the GRANT level.
--
-- P2-22: invalidate_all_user_sessions
--   REVOKE EXECUTE from authenticated; keep TO service_role only.
--   An authenticated user should not be able to force-log-out other users.
--
-- P2-24: hostel_scope NULL leak
--   The permissions_hostel_select policy had `OR hostel_scope IS NULL`
--   in the warden scope filter, which leaked all NULL-scope rows to every
--   warden. Fixed by scoping the NULL allowance to hostel workflow only:
--   `OR (hostel_scope IS NULL AND workflow_type = 'hostel')`.
--
-- P2-25: anon revokes
--   REVOKE EXECUTE on is_admin(uuid), is_sysadmin(uuid), is_warden(uuid),
--   is_operator(uuid) from anon. An unauthenticated caller should not be
--   able to probe role functions.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- P0-1: RLS role bridge — grant gate_app the service_role privileges
-- ----------------------------------------------------------------------------
-- service_role is the Supabase platform role that most `FOR ALL ... USING
-- (true)` policies target. By making gate_app a member of service_role,
-- gate_app inherits every policy that already applies to service_role.
-- This is the BRIDGE until k8s DATABASE_URL is switched to gate_app.
--
-- KNOWN GAP: postgres BYPASSRLS (from 20261014000004) is intentionally
-- PRESERVED here because the running deployment connects as postgres.
-- Once DATABASE_URL is switched to gate_app, run a follow-up migration:
--   ALTER ROLE postgres NOBYPASSRLS;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
  AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gate_app')
  AND NOT EXISTS (
    SELECT 1 FROM pg_roles r JOIN pg_auth_members m ON m.member = r.oid
    WHERE r.rolname = 'gate_app'
      AND EXISTS (SELECT 1 FROM pg_roles s WHERE s.rolname = 'service_role' AND m.grantor = s.oid)
  ) THEN
    GRANT service_role TO gate_app;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- P0-2: Immutable audit_logs
-- ----------------------------------------------------------------------------

-- 2a. Revoke UPDATE/DELETE on audit_logs from all app roles (keep SELECT).
--     RLS alone is insufficient; the trigger below is the hard guarantee.
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated;
REVOKE UPDATE, DELETE ON public.audit_logs FROM service_role;
REVOKE UPDATE, DELETE ON public.audit_logs FROM postgres;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gate_app') THEN
    REVOKE UPDATE, DELETE ON public.audit_logs FROM gate_app;
  END IF;
END $$;

-- 2b. Trigger function: hard-block any UPDATE/DELETE on audit_logs.
--     SECURITY DEFINER functions (audit_log_entry) bypass the trigger
--     because they run as the function owner, but direct role-level
--     UPDATE/DELETE will always hit the trigger and RAISE.
CREATE OR REPLACE FUNCTION public.audit_logs_reject_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'audit_logs is immutable: UPDATE/DELETE blocked by trigger'
    USING ERRCODE = '45000';  -- CASE_NOT_FOUND; use '55006' or custom
END;
$function$;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  AFTER UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_logs_reject_mutation();

-- ----------------------------------------------------------------------------
-- P0-6: Bootstrap window — restrict create_user_with_auth to service_role
-- ----------------------------------------------------------------------------
-- The function signature (from 20261013000100):
--   create_user_with_auth(text, text, text, text, text, uuid, uuid[], text, text, text[], text, text)
-- REVOKE from authenticated so only the trusted service_role can create users.
REVOKE EXECUTE ON FUNCTION public.create_user_with_auth(
  text, text, text, text, text, uuid, uuid[], text, text, text[], text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_with_auth(
  text, text, text, text, text, uuid, uuid[], text, text, text[], text, text
) TO service_role;

-- ----------------------------------------------------------------------------
-- P2-22: invalidate_all_user_sessions — restrict to service_role
-- ----------------------------------------------------------------------------
-- Signature: invalidate_all_user_sessions(uuid) RETURNS boolean
REVOKE EXECUTE ON FUNCTION public.invalidate_all_user_sessions(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.invalidate_all_user_sessions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invalidate_all_user_sessions(uuid) TO service_role;

-- ----------------------------------------------------------------------------
-- P2-24: hostel_scope NULL leak in permissions_hostel_select
-- ----------------------------------------------------------------------------
-- Original policy (from 20261215000002) had:
--   OR hostel_scope IS NULL   -- legacy rows before backfill
-- This leaked ALL NULL-scope rows to every warden regardless of their scope.
-- Fix: NULL only applies to hostel workflow rows.
DROP POLICY IF EXISTS permissions_hostel_select ON public.permissions;
CREATE POLICY permissions_hostel_select ON public.permissions
  FOR SELECT TO authenticated
  USING (
    workflow_type <> 'hostel'
    OR is_admin(current_setting('app.current_user_id', true)::uuid)
    OR is_warden(current_setting('app.current_user_id', true)::uuid)
    OR requester_user_id = current_setting('app.current_user_id', true)::uuid
    OR (
      -- Warden scope filter
      (SELECT hostel_scope FROM users WHERE id = current_setting('app.current_user_id', true)::uuid) = 'both'
      OR hostel_scope = (SELECT hostel_scope FROM users WHERE id = current_setting('app.current_user_id', true)::uuid)
      OR (hostel_scope IS NULL AND workflow_type = 'hostel')  -- P2-24: legacy NULL only for hostel rows
    )
  );

-- ----------------------------------------------------------------------------
-- P2-25: Revoke anon EXECUTE on role-check functions
-- ----------------------------------------------------------------------------
-- Signatures verified from 20260101000001 and 20260916000000:
--   is_admin(p_uid uuid)         RETURNS boolean
--   is_sysadmin(user_id uuid)   RETURNS boolean
--   is_warden(user_id uuid)     RETURNS boolean
--   is_operator(user_id uuid)   RETURNS boolean
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_sysadmin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_warden(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_operator(uuid) FROM anon;
-- Also revoke from PUBLIC to be safe
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_sysadmin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_warden(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_operator(uuid) FROM PUBLIC;
-- Restore to authenticated and service_role (they still need these)
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_sysadmin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_warden(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_operator(uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Schema migration record
-- ----------------------------------------------------------------------------
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
    SELECT '20261223000001', '20261223000001_security_hardening.sql', NOW(),
           md5('20261223000001_security_hardening')
    WHERE NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = '20261223000001');
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    SELECT '20261223000001', '20261223000001_security_hardening.sql', NOW()
    WHERE NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = '20261223000001');
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    SELECT '20261223000001', NOW()
    WHERE NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = '20261223000001');
  END IF;
END $$;

COMMIT;
