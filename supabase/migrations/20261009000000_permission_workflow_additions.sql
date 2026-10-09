-- ============================================================================
-- Migration: 20261009000000_permission_workflow_additions
-- Purpose: Add new roles, hostel scoping, and tables for multi-stage permission workflows.
-- ============================================================================

-- 1. Expand users.role CHECK constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (
  role IN (
    'operator','admin','sysadmin','supervisor','guardian','parent','hod','student',
    'warden','faculty','staff','worker','visitor',
    'caretaker','deputy_warden','hostel_manager','principal','vice_principal','oie','exam_branch'
  )
);

-- 2. Add hostel_scope to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS hostel_scope TEXT CHECK (hostel_scope IN ('boys','girls','both'));

-- 3. Permission Requests table
CREATE TABLE IF NOT EXISTS public.permission_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('hostel','exam','memo','staff_leave')),
  student_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  hostel_scope TEXT CHECK (hostel_scope IN ('boys','girls')),
  current_stage TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','ESCALATED','COMPLETED')),
  stage_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  document_required BOOLEAN NOT NULL DEFAULT FALSE,
  document_url TEXT,
  biometric_hostel_at TIMESTAMPTZ,
  biometric_gate_at TIMESTAMPTZ,
  digital_signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permission_requests_student ON public.permission_requests(student_user_id);
CREATE INDEX IF NOT EXISTS idx_permission_requests_ticket ON public.permission_requests(ticket_number);
CREATE INDEX IF NOT EXISTS idx_permission_requests_status ON public.permission_requests(status);
CREATE INDEX IF NOT EXISTS idx_permission_requests_workflow ON public.permission_requests(workflow_type);

-- 4. Device Verification Settings
CREATE TABLE IF NOT EXISTS public.device_verification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type TEXT NOT NULL CHECK (device_type IN ('thumb','face','barcode','qr')),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global','gate','hostel')),
  scope_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default settings (all disabled)
INSERT INTO public.device_verification_settings (device_type, enabled, scope) VALUES
('thumb', FALSE, 'global'),
('face', FALSE, 'global'),
('barcode', FALSE, 'global'),
('qr', FALSE, 'global')
ON CONFLICT DO NOTHING;

-- 5. Custom Reasons
CREATE TABLE IF NOT EXISTS public.custom_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('hostel','exam','memo','staff_leave')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (code, workflow_type)
);

-- 6. Document Templates
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  body_html TEXT NOT NULL,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('hostel','exam','memo','staff_leave')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Document Signatures
CREATE TABLE IF NOT EXISTS public.document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.permission_requests(id) ON DELETE CASCADE,
  signed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signature_hash TEXT NOT NULL
);

-- 8. Sequences for ticket numbers per workflow
CREATE SEQUENCE IF NOT EXISTS public.hostel_ticket_seq START 1001;
CREATE SEQUENCE IF NOT EXISTS public.exam_ticket_seq START 1001;
CREATE SEQUENCE IF NOT EXISTS public.memo_ticket_seq START 1001;
CREATE SEQUENCE IF NOT EXISTS public.staff_leave_ticket_seq START 1001;

-- 9. Triggers for updated_at on new tables
CREATE TRIGGER trg_permission_requests_updated_at
  BEFORE UPDATE ON public.permission_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_device_verification_settings_updated_at
  BEFORE UPDATE ON public.device_verification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
