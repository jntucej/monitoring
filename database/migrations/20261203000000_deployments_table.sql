-- ============================================================================
-- Deployments history table
-- Replaces the /var/log file-read approach in the Docker container.
-- CI writes deployment events via POST /api/admin/deployments.
-- The sysadmin console reads from this table via GET /api/sysadmin/deployments.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. deployments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deployments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version    TEXT,
  deployed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message    TEXT,
  source     TEXT NOT NULL DEFAULT 'ci',
  commit     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deployments_deployed_at ON public.deployments (deployed_at DESC);

ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'deployments' AND policyname = 'deployments_select_all'
  ) THEN
    CREATE POLICY "deployments_select_all" ON public.deployments
      FOR SELECT TO authenticated, postgres, service_role
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'deployments' AND policyname = 'deployments_service_all'
  ) THEN
    CREATE POLICY "deployments_service_all" ON public.deployments
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Grants (role + app role)
-- ----------------------------------------------------------------------------
GRANT SELECT ON public.deployments TO postgres, authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gate_app') THEN
    GRANT SELECT ON public.deployments TO gate_app;
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
      VALUES ('20261203000000', '20261203000000_deployments_table.sql', NOW(), md5('20261203000000_deployments_table'))
      ON CONFLICT (version) DO NOTHING;
    ELSE
      INSERT INTO public.schema_migrations (version)
      VALUES ('20261203000000')
      ON CONFLICT (version) DO NOTHING;
    END IF;
  END IF;
END $$;

COMMIT;
