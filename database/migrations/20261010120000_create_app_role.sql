-- 20261010120000_create_app_role.sql
DO $$BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gate_app') THEN
    -- Create without a password. The password must be set out-of-band via
    -- scripts/ops/rotate-gate-app-password.sh (reads GATE_APP_PASSWORD from env)
    -- and never committed to the repo.
    CREATE ROLE gate_app
      NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT LOGIN
      PASSWORD NULL;
  END IF;
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO gate_app', current_database());
END $$;
GRANT USAGE ON SCHEMA public TO gate_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gate_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gate_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO gate_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO gate_app;
