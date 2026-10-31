-- ============================================================================
-- Bootstrap: Initialize gate_monitor database with roles and extensions
-- ============================================================================
-- Run this on a FRESH database before schema.sql:
--   cat database/bootstrap.sql | docker exec -i gate_postgres psql -U postgres -d gate_monitor
--
-- Idempotent: safe to re-run, creates missing roles/extensions.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Custom Roles (safe no-ops if already exist)
-- ---------------------------------------------------------------------------
DO $$ BEGIN CREATE ROLE supabase_admin;  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE anon;           EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE gate_app;        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated;   EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE admin;          EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT supabase_admin TO service_role;

-- gate_app login credential. The app connects as
--   postgres://gate_app:<password>@host:port/db
-- so the role MUST carry a non-NULL password, or a fresh deploy cannot
-- authenticate. bootstrap.sql is fed by scripts/db-bootstrap.sh, which passes
-- the target credential via the GUC `gate.app_password` (SET from the
-- environment). Defaulting to 'postgres' keeps a bare `psql -f bootstrap.sql`
-- self-sufficient against the stock superuser password; in production
-- scripts/rotate-db-creds.sh later overrides this with a dedicated, rotated
-- value and rewrites the GATE_APP_PASSWORD that the compose DSN reads.
DO $$
BEGIN
  ALTER ROLE gate_app WITH LOGIN PASSWORD coalesce(nullif(current_setting('gate.app_password', true), ''), 'postgres');
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. Auth Schema (for SSO/MFA-related tables)
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth TO postgres;

-- ---------------------------------------------------------------------------
-- 4. Migration tracking table (used by most migrations' self-records)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT PRIMARY KEY,
  filename    TEXT NOT NULL,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checksum    TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- 5. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
