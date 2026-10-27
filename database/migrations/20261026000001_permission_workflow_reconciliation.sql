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

-- 9. Seed new roles in config_roles if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='config_roles') THEN
    INSERT INTO public.config_roles (code, display_name)
    VALUES
      ('caretaker', 'Hostel Caretaker - level 1 hostel approval'),
      ('deputy_warden', 'Deputy Warden - level 2 hostel approval'),
      ('hostel_manager', 'Hostel Manager - level 3 hostel approval'),
      ('principal', 'Principal - final executive authority'),
      ('vice_principal', 'Vice Principal - level 4 exam/leave approval'),
      ('oie', 'Officer Incharge Examinations'),
      ('exam_branch', 'Exam Branch Administrator')
    ON CONFLICT (code) DO NOTHING;
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
ON CONFLICT (code, workflow_type) DO NOTHING;

-- 11. Backward-compatible view for permission_requests
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='permissions') THEN
    CREATE OR REPLACE VIEW public.permission_requests AS
      SELECT *, requester_user_id AS student_user_id FROM public.permissions;
  END IF;
END $$;

-- 12. Reconcile views that predate the student_user_id -> requester_user_id
-- rename: v_my_ticket_counts (created by 20261012181951_ticket_indexes.sql)
-- still selects FROM public.permission_requests (student_user_id ...) using
-- the *pre-reconciliation* table name + column. Once the base table is renamed
-- to `permissions` and the column to `requester_user_id`, the VIEW alias
-- `permission_requests` above is a thin SELECT-alias, but v_my_ticket_counts
-- was created directly against the original table/column and would silently
-- break (or, on a from-scratch replay, fail to resolve `student_user_id`
-- against the renamed base) unless we rebind it to the post-rename names.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='permissions') THEN
    CREATE OR REPLACE VIEW public.v_my_ticket_counts AS
    SELECT
      p.requester_user_id                                   AS user_id,
      COUNT(*) FILTER (WHERE p.status = 'PENDING')           AS pending,
      COUNT(*) FILTER (WHERE p.status = 'APPROVED')          AS approved,
      COUNT(*) FILTER (WHERE p.status = 'REJECTED')          AS rejected,
      COUNT(*) FILTER (WHERE p.status = 'COMPLETED')         AS completed,
      COUNT(*) FILTER (WHERE p.status = 'CANCELLED')         AS cancelled,
      COUNT(*)                                                AS total
    FROM public.permissions p
    GROUP BY p.requester_user_id;
  END IF;
END $$;

