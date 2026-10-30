-- database/migrations/20261014000001_ensure_bypass_rls_for_app_role.sql
-- In legacy self-hosted setups this granted BYPASSRLS. In production, NOBYPASSRLS
-- is enforced per Phase 1 DoD to ensure RLS policies are active.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    ALTER ROLE postgres NOBYPASSRLS;
  END IF;
END $$;
