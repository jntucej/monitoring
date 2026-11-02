-- 20270106000003_force_rls_high_value_tables.sql
-- ENABLE ROW LEVEL SECURITY leaves the table owner as a bypass path: a
-- migration/maintenance connection that owns the table sees everything.
-- FORCE extends the policies to the owner, making RLS a real second net.
BEGIN;
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND c.relrowsecurity
       AND NOT c.relforcerowsecurity
     ORDER BY c.relname
  LOOP
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', r.relname);
    RAISE NOTICE 'forced RLS on %', r.relname;
  END LOOP;
END $$;
COMMIT;
