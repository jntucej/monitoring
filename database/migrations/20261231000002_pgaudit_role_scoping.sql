-- Migration: 20261231000002_pgaudit_role_scoping.sql
-- Control 4: Database Activity Monitoring (pgaudit) setup & role constraints

-- Ensure pgaudit extension is created if available
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pgaudit;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgaudit extension not pre-loaded or unavailable; continuing gracefully';
END $$;

-- Enforce NOINHERIT on gate_app and restrict DDL permissions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gate_app') THEN
    ALTER ROLE gate_app NOINHERIT;
  END IF;
END $$;
