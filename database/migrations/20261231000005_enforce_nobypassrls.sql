-- 20261231000005_enforce_nobypassrls.sql
-- Enforce NOBYPASSRLS on postgres and gate_app roles so RLS policies are active defense-in-depth

ALTER ROLE postgres NOBYPASSRLS;
ALTER ROLE gate_app NOBYPASSRLS;

GRANT ALL ON SCHEMA public TO gate_app;
GRANT ALL ON ALL TABLES IN SCHEMA public TO gate_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO gate_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO gate_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO gate_app;
