-- ============================================================================
-- Migration: 20261026000000_permission_workflow_reconciliation
-- Purpose: Reconcile permission tables, custom reasons, verification settings,
--          audit actions, and seed workflow roles & 21 custom reasons.
-- ============================================================================

-- 1. Rename permission_requests -> permissions (API uses this name)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='permission_requests')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='permissions') THEN
    ALTER TABLE public.permission_requests RENAME TO permissions;
  END IF;
END $$;

-- 2. Rename student_user_id -> requester_user_id (works for staff too)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='permissions' AND column_name='student_user_id'
  ) THEN
    ALTER TABLE public.permissions RENAME COLUMN student_user_id TO requester_user_id;
  END IF;
END $$;

-- 3. Add columns present in API insert / PATCH contract
ALTER TABLE public.permissions
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS from_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS to_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parent_notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ;

-- Sanitize any invalid priority values before adding check constraint
UPDATE public.permissions
SET priority = 'medium'
WHERE priority IS NULL OR priority NOT IN ('low', 'medium', 'high', 'urgent');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'permissions_priority_check' AND conrelid = 'public.permissions'::regclass
  ) THEN
    ALTER TABLE public.permissions
      ADD CONSTRAINT permissions_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
  END IF;
END $$;

-- 4. Document workflow invariant
-- Note: Hostel chain includes "hostel_biometric" between warden_or_principal and main_gate.

-- 5. document_signatures: update cascade rules and allow null signed_by if user is deleted
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='document_signatures' AND column_name='signed_by'
  ) THEN
    ALTER TABLE public.document_signatures ALTER COLUMN signed_by DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE public.document_signatures
  DROP CONSTRAINT IF EXISTS document_signatures_signed_by_fkey,
  DROP CONSTRAINT IF EXISTS document_signatures_document_id_fkey;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='document_signatures') THEN
    ALTER TABLE public.document_signatures
      ADD CONSTRAINT document_signatures_signed_by_fkey
        FOREIGN KEY (signed_by) REFERENCES public.users(id) ON DELETE SET NULL,
      ADD CONSTRAINT document_signatures_document_id_fkey
        FOREIGN KEY (document_id) REFERENCES public.permissions(id) ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE public.document_signatures
  ADD COLUMN IF NOT EXISTS algorithm TEXT NOT NULL DEFAULT 'sha256',
  ADD COLUMN IF NOT EXISTS document_hash TEXT;

-- 6. custom_reasons columns
ALTER TABLE public.custom_reasons
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 7. device_verification_settings: alter scope_id UUID -> TEXT (hostels are strings)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='device_verification_settings'
      AND column_name='scope_id' AND data_type != 'text'
  ) THEN
    ALTER TABLE public.device_verification_settings
      ALTER COLUMN scope_id TYPE TEXT USING scope_id::text;
  END IF;
END $$;

ALTER TABLE public.device_verification_settings
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 8. Widen audit_logs_action_known check constraint
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_known;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_known
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
    'PERMISSION_REQUEST_CREATED','PERMISSION_REQUEST_SUBMITTED',
    'PERMISSION_REQUEST_UPDATED','PERMISSION_REQUEST_APPROVED',
    'PERMISSION_REQUEST_REJECTED','PERMISSION_REQUEST_FORWARDED',
    'PERMISSION_REQUEST_ESCALATED','PERMISSION_REQUEST_CANCELLED',
    'PERMISSION_REQUEST_COMPLETED','PERMISSION_BIOMETRIC_VERIFIED',
    'PERMISSION_DOCUMENT_UPLOADED','PERMISSION_DOCUMENT_SIGNED',
    'PERMISSION_BULK_ACTION',
    'DEVICE_SETTING_UPDATED',
    'CUSTOM_REASON_CREATED','CUSTOM_REASON_UPDATED','CUSTOM_REASON_DELETED'
  ));

-- 9. Seed new roles in config_roles if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='config_roles') THEN
    INSERT INTO public.config_roles (role, description)
    VALUES
      ('caretaker', 'Hostel Caretaker - level 1 hostel approval'),
      ('deputy_warden', 'Deputy Warden - level 2 hostel approval'),
      ('hostel_manager', 'Hostel Manager - level 3 hostel approval'),
      ('principal', 'Principal - final executive authority'),
      ('vice_principal', 'Vice Principal - level 4 exam/leave approval'),
      ('oie', 'Officer Incharge Examinations'),
      ('exam_branch', 'Exam Branch Administrator')
    ON CONFLICT (role) DO NOTHING;
  END IF;
END $$;

-- 10. Seed 21 default custom reasons across workflow types
INSERT INTO public.custom_reasons (code, label, workflow_type)
VALUES
  -- hostel (6)
  ('medical_emergency', 'Medical Emergency', 'hostel'),
  ('family_emergency', 'Family Emergency', 'hostel'),
  ('home_visit', 'Home Visit / Vacation', 'hostel'),
  ('religious_event', 'Religious / Festival Function', 'hostel'),
  ('sports_event', 'Inter-College Sports Event', 'hostel'),
  ('academic_event', 'Conference / Seminar Attendance', 'hostel'),
  -- exam (6)
  ('exam_fee_payment', 'Exam Fee Challan Submission', 'exam'),
  ('certificate_request', 'Pass Certificate / Degree Issuance', 'exam'),
  ('transcript_request', 'Official Transcript Request', 'exam'),
  ('migration_cert', 'Migration Certificate Application', 'exam'),
  ('revaluation', 'Exam Paper Re-evaluation Request', 'exam'),
  ('backlog_exam', 'Supplementary / Backlog Registration', 'exam'),
  -- memo (4)
  ('bonafide_cert', 'Bonafide Certificate', 'memo'),
  ('internship_letter', 'Internship Recommendation Letter', 'memo'),
  ('noc_request', 'No Objection Certificate (NOC)', 'memo'),
  ('recommendation_letter', 'Higher Education Recommendation', 'memo'),
  -- staff_leave (5)
  ('study_leave', 'Higher Studies / Conference Leave', 'staff_leave'),
  ('medical_leave', 'Medical Leave (Staff)', 'staff_leave'),
  ('casual_leave', 'Casual Leave (CL)', 'staff_leave'),
  ('maternity_leave', 'Maternity / Paternity Leave', 'staff_leave'),
  ('earned_leave', 'Earned Leave (EL)', 'staff_leave')
ON CONFLICT (code) DO NOTHING;

-- 11. Backward-compatible view for permission_requests
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='permissions') THEN
    CREATE OR REPLACE VIEW public.permission_requests AS
      SELECT *, requester_user_id AS student_user_id FROM public.permissions;
  END IF;
END $$;

