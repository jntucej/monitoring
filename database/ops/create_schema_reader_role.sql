-- ============================================================================
-- Least-Privilege Role for Schema Drift Monitoring
--
-- Connects to the database and reads catalog definitions (pg_proc, pg_trigger,
-- pg_views, pg_matviews, information_schema).
-- System catalogs are readable by any role with CONNECT privilege; no special
-- superuser or table write access is granted.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'schema_reader') THEN
    CREATE ROLE schema_reader LOGIN PASSWORD 'change-me';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO schema_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO schema_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO schema_reader;
