-- 20261026000000_dev_contact_channel.sql
-- Direct-to-developer contact channel: every user can send improvement/feedback
-- messages to the developer via the project's Telegram bot. Their identity
-- (name, role, email, user id) is attached server-side.
BEGIN;

-- 1. Per-user opt-in flag (default ON => available to everyone)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS dev_contact_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.users.dev_contact_enabled IS
  'When true this user may send direct developer messages via /api/dev/contact.';

-- 2. Message store
CREATE TABLE IF NOT EXISTS public.developer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  user_name TEXT,
  user_role TEXT,
  user_email TEXT,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  channel TEXT NOT NULL DEFAULT 'web' CHECK (channel IN ('web', 'scan', 'student', 'support')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dev_msgs_unread ON public.developer_messages (created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dev_msgs_user ON public.developer_messages (user_id, created_at DESC);

ALTER TABLE public.developer_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='developer_messages'
      AND policyname='service_role_all_developer_messages'
  ) THEN
    CREATE POLICY "service_role_all_developer_messages" ON public.developer_messages
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. Whitelist the new audit action in the known-actions constraint
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
    'SCAN_CREATED', 'GATE_SCAN_RECORDED', 'SCAN_CORRECTED', 'MOVEMENT_CREATED',
    'VISITOR_CHECK_IN', 'VISITOR_CHECK_OUT',
    'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_DEACTIVATED',
    'ROLE_CHANGED', 'ACCOUNT_STATUS_CHANGED', 'PERMISSION_CHANGED',
    'SYSTEM_CONFIG_CHANGED', 'DATA_EXPORTED',
    'BACKUP_CREATED', 'BACKUP_RESTORED',
    'EMERGENCY_BROADCAST', 'GATE_OFFLINE', 'GATE_ONLINE',
    'SMART_SCHEDULE_APPLIED', 'CRON_REPORTS_EXECUTED',
    'PIN_CHANGED', 'PASSWORD_CHANGED',
    'SESSION_FORCE_REVOKED', 'SESSION_VERSION_BUMP',
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
    'MANUAL_ENTRY_AUTHORIZED', 'MANUAL_ENTRY_DENIED',
    'ENROLLMENT_CODE_ISSUED', 'ENROLLMENT_CODE_REDEEMED', 'ENROLLMENT_CODE_REJECTED',
    'USER_ONBOARDED', 'ROLE_GRANTED', 'ROLE_REVOKED', 'MOBILE_ENROLLMENT_CODE_ISSUED',
    'DEV_CONTACT_SENT'
  ));

-- 4. Track the applied migration if schema_migrations exists with filename/checksum
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='schema_migrations') THEN
    INSERT INTO public.schema_migrations (version, filename, checksum)
    VALUES ('20261026000000', '20261026000000_dev_contact_channel.sql', 'applied')
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;

COMMIT;
