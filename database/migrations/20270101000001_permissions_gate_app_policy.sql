-- ============================================================================
-- 20270101000001_permissions_gate_app_policy
-- Restores app-role writes to public.permissions after gate_app became
-- NOINHERIT + NOBYPASSRLS.
--
-- Why this is needed:
--   public.permissions has RLS enabled. The historical write path depended on
--   gate_app inheriting service_role policies through GRANT service_role TO
--   gate_app. Later migrations deliberately set gate_app to NOINHERIT and
--   NOBYPASSRLS, so that inherited bridge no longer applies. INSERTs from the
--   app role fail with SQLSTATE 42501 and the UI surfaces a generic failure.
--
-- What this adds:
--   Explicit, least-privilege gate_app policies on public.permissions:
--     - SELECT so the app can list rows
--     - INSERT so students/parents/staff can create requests
--     - UPDATE so workflow-stage transitions can advance tickets
--   The policies remain fail-closed for anon/authenticated and are only
--   trusted when the application sets a transaction-local app.current_role
--   GUC with an authorized role.
-- Idempotent: safe to re-run.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gate_app')
     AND EXISTS (SELECT 1 FROM pg_tables
                 WHERE schemaname = 'public' AND tablename = 'permissions') THEN

    -- gate_app is NOINHERIT + NOBYPASSRLS. It must not rely on service_role
    -- inheritance. Instead, give gate_app direct, least-privilege grants and
    -- scoped RLS policies. No USING (true) is created for gate_app.
    ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

    GRANT SELECT, INSERT, UPDATE ON public.permissions TO gate_app;

    -- SELECT: allow the app role to read rows it can legitimately serve in
    -- transaction context. The application must have set
    -- app.current_user_id / app.current_role to the actor before executing
    -- these queries.
    DROP POLICY IF EXISTS permissions_gate_app_select ON public.permissions;
    CREATE POLICY permissions_gate_app_select ON public.permissions
      FOR SELECT TO gate_app
      USING (
        (
          current_setting('app.current_user_id', true) IS NOT NULL
          AND current_setting('app.current_user_id', true)::uuid = requester_user_id
        )
        OR current_setting('app.current_role', true) IN (
          'admin','sysadmin','principal','vice_principal','supervisor'
        )
      );

    -- INSERT: allow the app role to insert rows only for the acting user.
    DROP POLICY IF EXISTS permissions_gate_app_insert ON public.permissions;
    CREATE POLICY permissions_gate_app_insert ON public.permissions
      FOR INSERT TO gate_app
      WITH CHECK (
        current_setting('app.current_user_id', true) IS NOT NULL
        AND NEW.requester_user_id = current_setting('app.current_user_id', true)::uuid
      );

    -- UPDATE: allow the app role to update only rows it can read.
    DROP POLICY IF EXISTS permissions_gate_app_update ON public.permissions;
    CREATE POLICY permissions_gate_app_update ON public.permissions
      FOR UPDATE TO gate_app
      USING (
        (
          current_setting('app.current_user_id', true) IS NOT NULL
          AND current_setting('app.current_user_id', true)::uuid = requester_user_id
        )
        OR current_setting('app.current_role', true) IN (
          'admin','sysadmin','principal','vice_principal','supervisor'
        )
      )
      WITH CHECK (
        (
          current_setting('app.current_user_id', true) IS NOT NULL
          AND current_setting('app.current_user_id', true)::uuid = requester_user_id
        )
        OR current_setting('app.current_role', true) IN (
          'admin','sysadmin','principal','vice_principal','supervisor'
        )
      );
  END IF;
END $$;

DO $$
DECLARE
  has_filename BOOLEAN;
  has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'schema_migrations'
      AND column_name = 'filename'
  ) INTO has_filename;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'schema_migrations'
      AND column_name = 'checksum'
  ) INTO has_checksum;

  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES (
      '20270101000001',
      '20270101000001_permissions_gate_app_policy.sql',
      NOW(),
      md5('20270101000001_permissions_gate_app_policy')
    )
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES (
      '20270101000001',
      '20270101000001_permissions_gate_app_policy.sql',
      NOW()
    )
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20270101000001', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;

COMMIT;
