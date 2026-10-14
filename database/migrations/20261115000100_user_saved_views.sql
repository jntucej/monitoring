-- ============================================================================
-- User Saved Views
-- Table: user_saved_views
-- Mirrors the established migration pattern: IF NOT EXISTS + service_role
-- policies + role grants + app_role grants + indexes.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. user_saved_views
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_saved_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_saved_views_user ON public.user_saved_views (user_id, sort_order);

ALTER TABLE public.user_saved_views ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_saved_views' AND policyname = 'user_saved_views_select_owner'
  ) THEN
    CREATE POLICY "user_saved_views_select_owner" ON public.user_saved_views
      FOR SELECT TO authenticated, postgres
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_saved_views' AND policyname = 'user_saved_views_service_all'
  ) THEN
    CREATE POLICY "user_saved_views_service_all" ON public.user_saved_views
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Grants (role + app role)
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO postgres, authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gate_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gate_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO gate_app;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Record migration in schema_migrations
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='schema_migrations') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='schema_migrations' AND column_name='filename')
       AND EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='schema_migrations' AND column_name='checksum') THEN
      INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
      VALUES ('20261115000100', '20261115000100_user_saved_views.sql', NOW(), md5('20261115000100_user_saved_views'))
      ON CONFLICT (version) DO NOTHING;
    ELSE
      INSERT INTO public.schema_migrations (version)
      VALUES ('20261115000100')
      ON CONFLICT (version) DO NOTHING;
    END IF;
  END IF;
END $$;

COMMIT;
