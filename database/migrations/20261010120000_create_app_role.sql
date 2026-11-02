-- 20261010120000_create_app_role.sql
-- Idempotent app role + credential. Fresh installs that run ONLY the migration
-- path (not database/bootstrap.sql) still get a working gate_app login:
-- if the role has no password, we set it from the GUC `gate.app_password`
-- (passed by the runner / scripts/migrate.ts) or the superuser password.
DO $$BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gate_app') THEN
    CREATE ROLE gate_app
      NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE INHERIT LOGIN;
  ELSE
    ALTER ROLE gate_app NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
  -- Always ensure a non-NULL password so postgres://gate_app:*** can connect.
  IF (SELECT rolpassword IS NULL FROM pg_authid WHERE rolname = 'gate_app')
     OR coalesce(nullif(current_setting('gate.app_password', true), ''), '') <> '' THEN
    ALTER ROLE gate_app WITH LOGIN PASSWORD coalesce(
      nullif(current_setting('gate.app_password', true), ''),
      current_setting('app.password', true),
      'postgres'
    );
  END IF;
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO gate_app', current_database());
END $$;
GRANT USAGE ON SCHEMA public TO gate_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gate_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gate_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO gate_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO gate_app;
