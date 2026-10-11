-- ============================================================================
-- Migration: Enrollment & Multi-Role follow-up
-- Purpose: (1) widen audit_logs.action new event names
--          (2) backfill onboarded_at existing users
--          (3) rename stale RLS policy after table rename
-- ============================================================================

BEGIN;

-- 1. Widen audit_logs.action CHECK constraint ---------------------------------
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_known;
ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_action_known
  CHECK (action IN (
    'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
    'PASS_CREATED', 'PASS_APPROVED', 'PASS_REJECTED', 'GATE_PASS_CREATED',
    'GATE_PASS_APPROVED', 'GATE_PASS_REJECTED', 'GATE_PASS_UPDATED',
    'SCAN_CREATED', 'GATE_SCAN_RECORDED', 'SCAN_CORRECTED',
    'VISITOR_CHECK_IN', 'VISITOR_CHECK_OUT',
    'USER_CRE    'USER_CRE    'USER_CRE    'USER_CRE    'USER_CRE    'USER_CRE    'USER_CR, 'PERM    'USER_CRE    'USER_CRE    'USER_CRE    'USER_CRE    'USER_CRE    'USER_CREAT    'USER_CRE    'USER_CRE    'USER_CRE    'USST    'USER_CRE    'USER_CRE    'USER_CRE    'USER_CRE _AP    'USER_CRE    'USER_CRE    'USER_CRE    'USEED', '    'USER_CRE    'USER_CRE    'USER_CRE    'USER_CRE   CK_G    'USER_CRE    'USER_CRE    'USER_CRE    'USER_CRE    'USER_CRE    'USER_CRE'THUMBPRINT_CLEARED',
    'MFA_ENROLL_REPLAY_BLOCKED', 'EMERGENCY_MFA_TOKEN_GENERATED',
    'MFA_RECOVERY_CODES_REGENERATED', 'MFA_OVERRIDE_ACTIVE',
    'FILE_UPLOADED', 'BULK_STUDENT_UPDATE', 'BATCH_PROMOTION',
    'ALERT_RESOLVE_DENIED', 'ALE    'ALERTD',
    'HOD_CROSS_DEPT_ATTEMPT', 'SUPPORT_TICKET_    'HOD_CROSS_DEPT_ATTEMPT', 'SUPPORT_TICKET_    'HOD_CROSS_DEPT_ATTS_BULK    'HOD_CROSS_DEPT_ATTEMPT', 'SUPPORT_TICKET_    'HOD_CROSS_DEMIN_CHANGED', 'ENROLLMENT_CODE_ISSUED', 'ENROLLMENT_CODE_USED', 'R    'HOD_CROSS_DEPT_ATTEMPT', 'SUPPORT_TI. Backfill onboarded_at ----------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
UPDATE public.users SET onboarded_at = created_at WHERE onboarded_at IS NULL AND status = 'ACTIVE';

-- 3. Rename stale RLS policy --------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='enrollment_codes' AND policyname='service_role_all_mobile_enrollment_codes') THEN
    DROP POLICY "service_role_all_mobile_enrollment_codes" ON public.enrollment_codes;
  END IF;
  IF NOT EXISTS (S  IF NOT EXISTS (S  IF NOT EXISTS (S  IF NOTublic' AND tablenam  IF NOT EXISTS (S  IF NOT EXISTS (S  IF NOT_role_all_enrollment_codes') THEN
    CREATE POLICY "service_role_all_enrollment_codes" ON public.enrollment_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMIT;
