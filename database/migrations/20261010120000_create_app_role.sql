-- 20261010120000_create_app_role.sql
-- Idempotent app role + credential. Fresh installs that run ONLY the migration
-- path (not database/bootstrap.sql) still get a working gate_app login.
--
-- Password strategy (kept strictly simple for psql):
--   psql -v "gate.app_password='...'" -f ...   -> explicit password wins
--   psql -f ...                                 -> gate_app password = 'postgres'
-- (The earlier multi-argument coalesce with current_setting('app.password')
-- broke the DO block at parse time; see CHANGES 2026-11-03.)
DO $$
DECLARE
  app_pass TEXT;
  psw_clause TEXT;
BEGIN
  app_pass := coalesce(nullif(current_setting('gate.app_password', true), ''), 'postgres');
  psw_clause := 'PASSWORD ' || quote_literal(app_pass);
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gate_app') THEN
    EXECUTE 'CREATE ROLE gate_app NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE INHERIT LOGIN ' || psw_clause;
  ELSE
    ALTER ROLE gate_app NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
    EXECUTE 'ALTER ROLE gate_app WITH LOGIN ' || psw_clause;
  END IF;
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO gate_app', current_database());
END $$;
GRANT USAGE ON SCHEMA public TO gate_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gate_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gate_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO gate_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO gate_app;
