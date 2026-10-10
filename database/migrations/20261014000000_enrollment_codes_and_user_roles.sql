
-- ============================================================================
-- Migration: Enrollment Codes (generalized) + User Roles Junction
-- Purpose: (1) Sysadmin issues one-time bootstrap codes; candidates self-init
--          (2) Support multi-role users via a junction table
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
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE   user_id        UUID NOT T  user_id        UUIose        TEXT NOT N  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE   user_id    ')),
  expires_at     TIMESTAMPTZ NOT NULL,
  used_at        TIMESTAMPTZ  used_at        TIMESTAMPTZ  used_at        TIMESTAMPTZ  used_at        LETE S  used_at        TIMESTAMPTZ  used_at        TIMESTAMPTZ  u)
)))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))ER TABLE public.enrollment_codes 
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'mobile' CHECK (pur  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'mobile' CHECK (pur  ADD COLUMN IF NOT Eive;
CREATE INDEX IF NOT EXISTS idx_enroll_user_active
  ON public.enrollment_codes (user_id, purpose, expires_at)
  WH  WH  WH  WH  WH  WH  WH  WH  WH  WH  WH  WH  WH  WH  WH  WH  WH  WH LEVEL SECURITY;

DO $$
BEBEBEBEBEBEBEBEBEBEBEBEBEBEBEBEBEBEBEBEBEBEBEies 
    WHERE schemaname='public' AND tablename='enrollment_codes' AN    WHERE schemaname='public' AND tablename='enrollment_codes' AN    WHERE schemaname='public' AND tablename='enrollment_codes' AN    WHERE schemaname='public' AND tablename='enrollment_codes' AN    WHERE schND    WHERE schemaname='public' AND tt wa    WHERE schemaname='public' AND tablename='enrollment_codes' AN    WHERE schemaname='public' AND tablename='enrollment_codes' AN    WHERE schemaname='public' AND tades"
  ON public.enrollment_codes FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2. User Roles-- 2. User Roles-- 2. User Roles-- 2. User Roles-- 2. User Roles-- 2. User Roles-- 2. User Roles-- 2. User Roles-- 2. User Roles-- 2. User Roles-- 2. User Roles-- 2. User RoCADE,-- 2. User Roles-- 2. User Roles-- 2. UserTEXT,
                                                         ,
  g  g  g  g  g  g  g  g  g  g  g  g  g  g  g  g  g  g  g  g  g  g  g  g  g  g  g  g  g scope, ''))
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_user_roles" ON public.user_roles;
CREATE POLICY "service_role_all_user_roles" 
  ON public.user_roles FOR ALL TO service_role 
  USING (true) WITH CHECK (true);

-- 3. Seed Existing Roles ------------------------------------------------------
INSERT INTO public.user_roles (user_id, role, granted_by, granted_at)
SELECT id, role, NULSELECT id, role, NULSELECT sers
ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON Oc AS $$ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON OT FROM ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON ON OND scope IS NULL;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.role IS DISTINCT FROM OLD.r  IF TG_OP = 'INSERT' OR NEW.role IS DISTINCT FROM OLD.r  IF TG_OP = )
    V    V    V    V    V    V    V    V    V    V  DO NOTHING;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_primarDROP TRIGGER IF EXISTS trg_sync_pri TRIGGER tDROP TRIGGER IF EXISTS trg_sync_primarDR OR UPDATE OF role ON public.users
  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOion f  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FORE  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA er_id UUID)  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOion f  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FORE  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA er_id UUID)  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOion f  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FORE  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA er_id d_  FOR NULL
  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOion f  FOR EA  FOR EA  FOR EA  FOR EA  FO--  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FOR EA  FONSTRAINT IF EXI  FOR EA  logs_action_known;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_known
  CHECK (action IN (
    'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED'RE    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'PA    'PASS_CREATED', 'ULK_STUDENT_UPDATE', 'BATCH_PROMOTION',
    'ALERT_RESOLVE_DENIED', 'ALE    'ALERT_RESOLVE'HO    'ALERT_RESOLVE_DENIED', 'ALE    ET_UPDATED',
    'RETENTION_RUN', 'PREDICTIONS_RETRAINED',
    'GATE_PASS_BULK_APPROVED', 'ADMIN_STREAM_OTHER_USER',
    'MFA_REQUIRED_FOR_ADMIN_CHANGED', 'ROLE_REGISTRY_CHANGED',
    'ENROLLMENT_CODE_ISSUED', 'ENROLLMENT_CODE_REDEEMED', 'ENROLLMENT_CODE_REJECTED',
    'USER_ONBOARDED', 'ROLE_GRANTED', 'ROLE_REVOKED', 'MOBILE_ENROLLMENT_CODE_ISSUED'
  ));

COMMIT;
