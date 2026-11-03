-- 20270106000001_gate_app_grant_hardening.sql
-- 20261231000005 granted ALL (incl. TRUNCATE, REFERENCES, TRIGGER) to
-- gate_app on every public table AND set ALTER DEFAULT PRIVILEGES to ALL,
-- so every table created after that migration also carries TRUNCATE.
-- Tighten to CRUD only: a compromised app role must not be able to
-- TRUNCATE audit_logs or create triggers.
BEGIN;
DO $$
DECLARE
  r TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gate_app') THEN
    RAISE NOTICE 'gate_app role missing; skipping';
    RETURN;
  END IF;

  -- Revoke the dangerous privileges from every public table/view.
  FOR r IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind IN ('r','v','m')
  LOOP
    EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM gate_app', r);
  END LOOP;

  -- Reset default privileges so future tables don't inherit ALL.
  ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM gate_app;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM gate_app;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO gate_app;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO gate_app;

  RAISE NOTICE 'gate_app hardened to CRUD-only';
END $$;
COMMIT;
