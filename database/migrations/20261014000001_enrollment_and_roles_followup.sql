-- ============================================================================
-- Migration: Enrollment + Multi-Role follow-up
-- Purpose: (1) widen audit_logs.action for new event names
--          (2) backfill onboarded_at on existing users
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
    'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_DEACTIVATED',
    'ROLE_CHANGED', 'PERMISSION_CHANGED',
    'SYSTEM_CONFIG_CHANGED', 'DATA_EXPORTED',
    'BACKUP_CREATED', 'BACKUP_RESTORED',
    'EMERGENCY_BROADCAST', 'GATE_OFFLINE', 'GATE_ONLINE',
    'SMART_SCHEDULE_APPLIED', 'CRON_REPORTS_EXECUTED',
    'PIN_CHANGED', 'SESSION_FORCE_REVOKED', 'SESSION_VERSION_BUMP',
    'BACK_GATE_GEO_MISMATCH', 'REFRESH_REVOKED_TOKEN_USED',
    'THUMBPRINT_REGISTERED', 'THUMBPRINT_CLEARED',
    'MFA_ENROLL_REPLAY_BLOCKED', 'EMERGENCY_MFA_TOKEN_GENERATED',
    'MFA_RECOVERY_CODES_REGENERATED', 'MFA_OVERRIDE_ACTIVE',
    'FILE_UPLOADED', 'BULK_STUDENT_UPDATE', 'BATCH_PROMOTION',
    'ALERT_RESOLVE_DENIED', 'ALERT_RESOLVED',
    'HOD_CROSS_DEPT_ATTEMPT', 'SUPPORT_TICKET_UPDATED',
    'RETENTION_RUN', 'PREDICTIONS_RETRAINED',
    'GATE_PASS_BULK_APPROVED', 'ADMIN_STREAM_OTHER_USER',
    'MFA_REQUIRED_FOR_ADMIN_CHANGED', 'ROLE_REGISTRY_CHANGED',
    'ENROLLMENT_CODE_ISSUED',
    'ENROLLMENT_CODE_REDEEMED',
    'ENROLLMENT_CODE_REJECTED',
    'USER_ONBOARDED',
    'ROLE_GRANTED',
    'ROLE_REVOKED',
    'MOBILE_ENROLLMENT_CODE_ISSUED',
    'BOOTSTRAP_LOCKOUT'
  ));

-- 2. Backfill onboarded_at on existing users ----------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
UPDATE public.users
   SET onboarded_at = COALESCE(created_at, NOW())
 WHERE onboarded_at IS NULL
   AND (password_hash IS NOT NULL OR initial_pin_hash IS NOT NULL);

-- 3. Rename stale RLS policy if the table was renamed -------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'enrollment_codes'
      AND policyname = 'service_role_all_mobile_enrollment_codes'
  ) THEN
    ALTER POLICY "service_role_all_mobile_enrollment_codes"
      ON public.enrollment_codes RENAME TO "service_role_all_enrollment_codes";
  END IF;
END $$;

COMMIT;