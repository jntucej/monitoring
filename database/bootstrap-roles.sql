-- Roles needed by migrations (safe no-ops if already exist)
DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE admin; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT supabase_admin TO authenticated;
GRANT supabase_admin TO admin;
CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth TO postgres;
