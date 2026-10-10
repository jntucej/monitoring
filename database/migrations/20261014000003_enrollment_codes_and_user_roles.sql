-- ============================================================================
-- Migration: Enrollment Codes (generalized) + User Roles Junction
-- Purpose: (1) Sysadmin issues one-time bootstrap codes; candidates self-init
--          (2) Support multi-role users junction table
-- ============================================================================

BEGIN;

-- 1. Generalize mobile_enrollment_codes -> enrollment_codes -------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='mobile_enrollment_codes')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='enrollment_codes')
  THEN
    ALTER TABLE public.mobile_enrollment_codes RENAME TO enrollment_codes;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.enrollment_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE   user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE   user_id UUID NOT NUL_a  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE   user_id UUID obile', 'web_bootstrap', 'pin_reset', 'role_bootstrap'))
);

DO $$
BEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGNOT NULL DEFAULT 'mobile' CHECK (purpose IN ('mobile', 'web_BEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEGBEn THEN END;
END $$;

CREATE INDEX IF NOT EXISTS idx_enroll_user_active
  ON public.enrollment_codes (user_id, purpose, expires_at)
  WHERE used_at IS NULL;

ALTER TABLE public.enrollment_codes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablenam'
  ) THEN
    CREATE POLICY "service_role_all_enrollment_codes" ON public.enrollment_codes FOR ALL TO service_role USING (true)    CREATE POLICY "service_role_all_enrollment_codes" ON public.enrollment_codes FOR ALL TO service_role USING (true)    CREATE POLICY "service_role_all_enrollment_codes" ON public.enrollment_codes FOR ALL TO service_role USING (true)    CREATE POLICY "service_role_all_enrollmentted_by UUID     CREATE POLICY "service_role_all_enrollment_codes" ON public.enrollment_codes FOR ALL TO service_role USING (true)    CREATE POLICY "service_role_all_enrollment_codes" ON public.enrollment_codes FOR ALL TO service_role US NOT EXISTS     CREATE POLICY "service_role_all_enrollment_c
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO DO DO DO DO DO DO DXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user    SELECT 1 olicy    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user    SELECT 1 olicy    SELECT 1 FROM pg_policies WHERE schemle USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. Backfill User Roles -----------------------------------------------------
INSERT INTO public.user_roles (user_id, role, granted_at)
SELECT id, role, created_at FROM public.users
ON CONFLICT (user_id, role) DO NOTHING;

COMMIT;
