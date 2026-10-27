-- ============================================================================
-- Migration: 20261223000002_config_roles_registry_view
-- Purpose: P1-12 — Replace the legacy `config_roles` table with a VIEW over
--          `config_roles_registry`, unifying all role reads/writes on the
--          single source of truth.
--
-- Strategy:
--   1. If `config_roles` is a real TABLE, copy any rows into
--      `config_roles_registry` (ON CONFLICT DO NOTHING), then drop the table.
--   2. Create a VIEW `config_roles` over `config_roles_registry` so every
--      existing query (SELECT / INSERT / UPDATE / DELETE) still resolves.
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- P1-12: config_roles is now a VIEW over config_roles_registry; all reads/writes go to the registry

DO $$
BEGIN
  -- Drop any pre-existing view named config_roles (from a prior failed run)
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'config_roles'
  ) THEN
    DROP VIEW public.config_roles;
  END IF;
END $$;

-- Copy rows from the legacy table into the registry, then drop the table.
-- The registry was seeded in 20261010000000; any rows added only to
-- config_roles (e.g. by 20261026000001 section 9) are merged here.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'config_roles') THEN
    -- Merge legacy rows into the registry.
    -- The legacy config_roles table has (code, display_name, permissions, is_active,
    -- created_at, updated_at) — no is_privileged or is_super.
    -- Use a conditional INSERT so only codes not already in the registry are added,
    -- and default the privilege flags to false.
    INSERT INTO public.config_roles_registry (code, display_name, is_privileged, is_active)
    SELECT
      c.code,
      c.display_name,
      false,
      COALESCE(c.is_active, true)
    FROM public.config_roles c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.config_roles_registry r WHERE r.code = c.code
    )
    ON CONFLICT (code) DO NOTHING;

    -- Drop the now-redundant table
    DROP TABLE public.config_roles;

    -- Re-create it as a thin view so existing code paths keep resolving.
    -- The legacy table had columns not present on the registry
    -- (permissions, description, icon_name, default_redirect, updated_at),
    -- so expose them as NULL to keep SELECT * queries working.
    CREATE VIEW public.config_roles AS
      SELECT
        r.code,
        r.display_name,
        NULL::jsonb AS permissions,
        NULL::text  AS description,
        NULL::text  AS icon_name,
        NULL::text  AS default_redirect,
        r.is_active,
        r.created_at,
        NULL::timestamptz AS updated_at
      FROM public.config_roles_registry r;

    COMMENT ON VIEW public.config_roles IS
      'P1-12: config_roles is a VIEW over config_roles_registry; all reads/writes go to the registry.';
  ELSIF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'config_roles'
  ) THEN
    -- Already a view (idempotent re-run) — refresh to point at the registry
    CREATE OR REPLACE VIEW public.config_roles AS
      SELECT
        r.code,
        r.display_name,
        NULL::jsonb AS permissions,
        NULL::text  AS description,
        NULL::text  AS icon_name,
        NULL::text  AS default_redirect,
        r.is_active,
        r.created_at,
        NULL::timestamptz AS updated_at
      FROM public.config_roles_registry r;
  ELSE
    -- Neither a table nor a view existed; create the view fresh
    CREATE VIEW public.config_roles AS
      SELECT
        r.code,
        r.display_name,
        NULL::jsonb AS permissions,
        NULL::text  AS description,
        NULL::text  AS icon_name,
        NULL::text  AS default_redirect,
        r.is_active,
        r.created_at,
        NULL::timestamptz AS updated_at
      FROM public.config_roles_registry r;

    COMMENT ON VIEW public.config_roles IS
      'P1-12: config_roles is a VIEW over config_roles_registry; all reads/writes go to the registry.';
  END IF;
END $$;

-- Ensure validate_user_role() still reads config_roles_registry (it already
-- does since 20261010000000; this re-assertion is defensive).
CREATE OR REPLACE FUNCTION public.validate_user_role()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.config_roles_registry
    WHERE code = NEW.role AND is_active
  ) THEN
    RAISE EXCEPTION 'Invalid or inactive role: %', NEW.role;
  END IF;
  RETURN NEW;
END;
$function$;

-- Self-record
DO $$
DECLARE
  has_filename BOOLEAN;
  has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schema_migrations'
      AND column_name = 'filename') INTO has_filename;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schema_migrations'
      AND column_name = 'checksum') INTO has_checksum;
  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('20261223000002',
            '20261223000002_config_roles_registry_view.sql', NOW(),
            md5('20261223000002_config_roles_registry_view'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261223000002',
            '20261223000002_config_roles_registry_view.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261223000002', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
