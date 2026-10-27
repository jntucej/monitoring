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
GRANT supabase_admin TO authenticated;
GRANT supabase_admin TO admin;

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
