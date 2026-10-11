-- ============================================================================
-- Migration: Enrollment & Multi-Role follow-up
-- Purpose: (1) backfill onboarded_at existing users
--          (2) rename stale RLS policy after table rename
-- ============================================================================

BEGIN;

-- 1. audit_logs_action_known constraint is now managed by 20261027000000_audit_action_canonical.sql
-- This migration no longer modifies audit_logs_action_known (no-op)

-- 2. Backfill onboarded_at ----------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
UPDATE public.users SET onboarded_at = created_at WHERE onboarded_at IS NULL AND status = 'ACTIVE';

-- 3. Rename stale RLS policy --------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='enrollment_codes' AND policyname='service_role_all_mobile_enrollment_codes') THEN
    DROP POLICY "service_role_all_mobile_enrollment_codes" ON public.enrollment_codes;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='enrollment_codes' AND policyname='service_role_all_enrollment_codes'
  ) THEN
    CREATE POLICY "service_role_all_enrollment_codes" ON public.enrollment_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMIT;
