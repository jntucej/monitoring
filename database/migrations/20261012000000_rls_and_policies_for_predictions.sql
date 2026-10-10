-- ============================================================================
-- Migration: 20261012000000_rls_and_policies_for_predictions
-- Purpose: Enable RLS and create policies for the 'predictions' table.
-- ============================================================================

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY
IF NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'predictions' AND policyname = 'auth_all_predictions'
) THEN
  CREATE POLICY auth_all_predictions ON public.predictions
  FOR ALL TO authenticated
  USING (public.is_admin_self())
  WITH CHECK (public.is_admin_self());
END IF;

IF NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'predictions' AND policyname = 'admin_read_predictions'
) THEN
  CREATE POLICY admin_read_predictions ON public.predictions
  FOR SELECT TO admin
  USING (public.is_admin_self());
END IF;
