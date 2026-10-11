-- database/migrations/20261014000001_ensure_bypass_rls_for_app_role.sql
-- Ensure the Postgres app role has BYPASSRLS for direct pool connections in self-hosted deployments.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    ALTER ROLE postgres BYPASSRLS;
  END IF;
END $$;
