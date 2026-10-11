-- Migration: 20261014000000_audit_tsv_and_actions.sql
-- Description: Add full-text search TSV column to audit_logs and expand audit action check constraint
-- Issues: #385, #403

BEGIN;

-- 1. Add full-text search TSV generated column and index for fast details search (Issue #403)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_logs'
      AND column_name = 'details_text_tsv'
  ) THEN
    ALTER TABLE public.audit_logs
      ADD COLUMN details_text_tsv tsvector
      GENERATED ALWAYS AS (to_tsvector('english', COALESCE(details::text, ''))) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_details_tsv
  ON public.audit_logs USING gin (details_text_tsv);

-- 2. Update audit_logs_action_known constraint to include newly audited actions (Issue #385)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_logs_action_known'
      AND conrelid = 'public.audit_logs'::regclass
  ) THEN
    ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_action_known;
  END IF;
END $$;

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
    'PHOTO_CAPTURED', 'PHOTO_CAPTURE_CONSENT_DENIED',
    'MANUAL_ENTRY_AUTHORIZED', 'MANUAL_ENTRY_DENIED'
  ));

COMMIT;
