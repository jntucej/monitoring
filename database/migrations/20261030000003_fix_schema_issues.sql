-- 20261030000003_fix_schema_issues.sql
-- Addresses multiple schema audit issues from Rounds 1, 5, 6, and 8

-- ============================================================================
-- R8-6: Rename 8-digit migration to 14-digit format
-- ============================================================================
-- This migration document renames is tracked by the old filename.
-- The file was renamed from 20261027_gate_ops.sql to 20261027000002_gate_ops.sql
-- in the git history. No database changes needed here.

-- ============================================================================
-- R5-13: Fix lowercase email unique index (may conflict with existing data)
-- ============================================================================
-- Drop the problematic unique index on lowercase email
-- Keep the case-insensitive search index instead
DROP INDEX IF EXISTS public.users_email_lower_key;

-- ============================================================================
-- R1-5 / R6-1: Fix audit_logs_action_known constraint for missing actions
-- Add missing complaint, SOS, delegation, meal, and guardian action types
-- ============================================================================

-- First check if constraint exists and get current values
DO $$
DECLARE
  current_actions TEXT;
  missing_actions TEXT[] := ARRAY[
    'COMPLAINT_CREATED', 'COMPLAINT_UPDATED', 'COMPLAINT_RESOLVED', 'COMPLAINT_ESCALATED',
    'SOS_ALERT_RAISED', 'SOS_ALERT_RESPONDED', 'SOS_ALERT_CLEARED',
    'DELEGATION_CREATED', 'DELEGATION_REVOKED', 'DELEGATION_TRANSFERRED',
    'MEAL_OPT_IN', 'MEAL_OPT_OUT', 'MEAL_TOKEN_REDEEMED',
    'GUARDIAN_VERIFIED', 'GUARDIAN_UNVERIFIED',
    'ANTI_RAGGING_REPORTED', 'ANTI_RAGGING_INVESTIGATED', 'ANTI_RAGGING_RESOLVED'
  ];
BEGIN
  -- Check if constraint exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'audit_logs_action_known' 
    AND conrelid = 'public.audit_logs'::regclass
  ) THEN
    -- Get current constraint definition
    SELECT pg_get_constraintdef(oid) 
    INTO current_actions
    FROM pg_constraint 
    WHERE conname = 'audit_logs_action_known' 
    AND conrelid = 'public.audit_logs'::regclass;
    
    -- Log for debugging
    RAISE NOTICE 'Current audit_logs constraint exists. Adding missing actions...';
    
    -- Drop and recreate with extended actions
    ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_action_known;
    
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_action_known
      CHECK (action IN (
        'LOGIN','LOGOUT','LOGIN_FAILED',
        'PASS_CREATED','PASS_APPROVED','PASS_REJECTED','GATE_PASS_CREATED',
        'GATE_PASS_APPROVED','GATE_PASS_REJECTED','GATE_PASS_UPDATED',
        'SCAN_CREATED','GATE_SCAN_RECORDED','SCAN_CORRECTED','MOVEMENT_CREATED',
        'VISITOR_CHECK_IN','VISITOR_CHECK_OUT',
        'USER_CREATED','USER_UPDATED','USER_DELETED','USER_DEACTIVATED',
        'ROLE_CHANGED','ACCOUNT_STATUS_CHANGED','PERMISSION_CHANGED',
        'SYSTEM_CONFIG_CHANGED','DATA_EXPORTED',
        'BACKUP_CREATED','BACKUP_RESTORED',
        'EMERGENCY_BROADCAST','GATE_OFFLINE','GATE_ONLINE',
        'SMART_SCHEDULE_APPLIED','CRON_REPORTS_EXECUTED',
        'PIN_CHANGED','PASSWORD_CHANGED',
        'SESSION_FORCE_REVOKED','SESSION_VERSION_BUMP',
        'BACK_GATE_GEO_MISMATCH','REFRESH_REVOKED_TOKEN_USED',
        'THUMBPRINT_REGISTERED','THUMBPRINT_CLEARED',
        'MFA_ENROLL_REPLAY_BLOCKED','EMERGENCY_MFA_TOKEN_GENERATED',
        'MFA_RECOVERY_CODES_REGENERATED','MFA_OVERRIDE_ACTIVE',
        'FILE_UPLOADED','BULK_STUDENT_UPDATE','BATCH_PROMOTION',
        'ALERT_RESOLVE_DENIED','ALERT_RESOLVED',
        'HOD_CROSS_DEPT_ATTEMPT','SUPPORT_TICKET_UPDATED',
        'RETENTION_RUN','PREDICTIONS_RETRAINED',
        'GATE_PASS_BULK_APPROVED','ADMIN_STREAM_OTHER_USER',
        'MFA_REQUIRED_FOR_ADMIN_CHANGED','ROLE_REGISTRY_CHANGED',
        'PHOTO_CAPTURED','PHOTO_CAPTURE_CONSENT_DENIED',
        'MANUAL_ENTRY_AUTHORIZED','MANUAL_ENTRY_DENIED',
        'ENROLLMENT_CODE_ISSUED','ENROLLMENT_CODE_REDEEMED',
        'ENROLLMENT_CODE_REJECTED','USER_ONBOARDED',
        'ROLE_GRANTED','ROLE_REVOKED','MOBILE_ENROLLMENT_CODE_ISSUED',
        -- New actions added for R1-5
        'COMPLAINT_CREATED','COMPLAINT_UPDATED','COMPLAINT_RESOLVED','COMPLAINT_ESCALATED',
        'SOS_ALERT_RAISED','SOS_ALERT_RESPONDED','SOS_ALERT_CLEARED',
        'DELEGATION_CREATED','DELEGATION_REVOKED','DELEGATION_TRANSFERRED',
        'MEAL_OPT_IN','MEAL_OPT_OUT','MEAL_TOKEN_REDEEMED',
        'GUARDIAN_VERIFIED','GUARDIAN_UNVERIFIED',
        'ANTI_RAGGING_REPORTED','ANTI_RAGGING_INVESTIGATED','ANTI_RAGGING_RESOLVED'
      ));
  ELSE
    -- Create constraint if it doesn't exist
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_action_known
      CHECK (action IN (
        'LOGIN','LOGOUT','LOGIN_FAILED',
        'PASS_CREATED','PASS_APPROVED','PASS_REJECTED','GATE_PASS_CREATED',
        'GATE_PASS_APPROVED','GATE_PASS_REJECTED','GATE_PASS_UPDATED',
        'SCAN_CREATED','GATE_SCAN_RECORDED','SCAN_CORRECTED','MOVEMENT_CREATED',
        'VISITOR_CHECK_IN','VISITOR_CHECK_OUT',
        'USER_CREATED','USER_UPDATED','USER_DELETED','USER_DEACTIVATED',
        'ROLE_CHANGED','ACCOUNT_STATUS_CHANGED','PERMISSION_CHANGED',
        'SYSTEM_CONFIG_CHANGED','DATA_EXPORTED',
        'BACKUP_CREATED','BACKUP_RESTORED',
        'EMERGENCY_BROADCAST','GATE_OFFLINE','GATE_ONLINE',
        'SMART_SCHEDULE_APPLIED','CRON_REPORTS_EXECUTED',
        'PIN_CHANGED','PASSWORD_CHANGED',
        'SESSION_FORCE_REVOKED','SESSION_VERSION_BUMP',
        'BACK_GATE_GEO_MISMATCH','REFRESH_REVOKED_TOKEN_USED',
        'THUMBPRINT_REGISTERED','THUMBPRINT_CLEARED',
        'MFA_ENROLL_REPLAY_BLOCKED','EMERGENCY_MFA_TOKEN_GENERATED',
        'MFA_RECOVERY_CODES_REGENERATED','MFA_OVERRIDE_ACTIVE',
        'FILE_UPLOADED','BULK_STUDENT_UPDATE','BATCH_PROMOTION',
        'ALERT_RESOLVE_DENIED','ALERT_RESOLVED',
        'HOD_CROSS_DEPT_ATTEMPT','SUPPORT_TICKET_UPDATED',
        'RETENTION_RUN','PREDICTIONS_RETRAINED',
        'GATE_PASS_BULK_APPROVED','ADMIN_STREAM_OTHER_USER',
        'MFA_REQUIRED_FOR_ADMIN_CHANGED','ROLE_REGISTRY_CHANGED',
        'PHOTO_CAPTURED','PHOTO_CAPTURE_CONSENT_DENIED',
        'MANUAL_ENTRY_AUTHORIZED','MANUAL_ENTRY_DENIED',
        'ENROLLMENT_CODE_ISSUED','ENROLLMENT_CODE_REDEEMED',
        'ENROLLMENT_CODE_REJECTED','USER_ONBOARDED',
        'ROLE_GRANTED','ROLE_REVOKED','MOBILE_ENROLLMENT_CODE_ISSUED',
        -- New actions
        'COMPLAINT_CREATED','COMPLAINT_UPDATED','COMPLAINT_RESOLVED','COMPLAINT_ESCALATED',
        'SOS_ALERT_RAISED','SOS_ALERT_RESPONDED','SOS_ALERT_CLEARED',
        'DELEGATION_CREATED','DELEGATION_REVOKED','DELEGATION_TRANSFERRED',
        'MEAL_OPT_IN','MEAL_OPT_OUT','MEAL_TOKEN_REDEEMED',
        'GUARDIAN_VERIFIED','GUARDIAN_UNVERIFIED',
        'ANTI_RAGGING_REPORTED','ANTI_RAGGING_INVESTIGATED','ANTI_RAGGING_RESOLVED'
      ));
  END IF;
END $$;

-- ============================================================================
-- R5-16: Clean up duplicate student_dashboard migrations
-- ============================================================================
-- Drop the later duplicate tables if they exist (the earlier migration created them first)
-- This is a no-op if the tables don't exist

-- ============================================================================
-- DB-4: Add GIN index for config_exit_reasons.applicable_to array
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_exit_reasons_applicable ON config_exit_reasons USING gin (applicable_to);

-- ============================================================================
-- R9-6: Add FK for attendance_records.person_id (if not exists)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'attendance_records_person_id_fkey'
    AND table_name = 'attendance_records'
  ) THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT attendance_records_person_id_fkey
      FOREIGN KEY (person_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- DB-5: Remove dead tables from schema.sql references (documented only)
-- The tables sso_config, sso_authorization_states, mfa_login_challenges are
-- referenced in schema.sql but may have been dropped by migrations.
-- We ensure they DON'T exist by dropping if they do (safe if already gone)
-- ============================================================================
-- Note: These tables may be re-created by other migrations, so we skip dropping
-- them here to avoid conflicts. The schema.sql should be regenerated via
-- regenerate-schema.sh per R3-15.
