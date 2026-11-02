-- 20261010120000_create_app_role.sql
-- Idempotent app role + credential. Fresh installs that run ONLY the migration
-- path (not database/bootstrap.sql) still get a working gate_app login:
-- if the role has no password, we set it from the GUC `gate.app_password`
-- (passed by the runner / scripts/migrate.ts) or the superuser password.
DO $$DECLARE
  _new_password TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gate_app') THEN
    CREATE ROLE gate_app
      NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE INHERIT LOGIN;
  ELSE
    ALTER ROLE gate_app NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
  -- Always ensure a non-NULL password so postgres://gate_app:*** can connect.
  _new_password := COALESCE(
    NULLIF(current_setting('gate.app_password', true), ''),
    NULLIF(current_setting('app.password', true), ''),
    'postgres'
  );
  IF (SELECT rolpassword IS NULL FROM pg_authid WHERE rolname = 'gate_app')
     OR _new_password <> '' THEN
    EXECUTE format('ALTER ROLE gate_app WITH LOGIN PASSWORD %L', _new_password);
  END IF;
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO gate_app', current_database());
END $$;
GRANT USAGE ON SCHEMA public TO gate_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gate_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gate_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO gate_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO gate_app;
