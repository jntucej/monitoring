-- ============================================================================
-- Migration: 20261110000000_add_lab_access_workflow
-- Purpose: Add Lab Access workflow with LAB ticket prefix, chain-driven approval
-- ============================================================================

-- 1. Expand users.role CHECK constraint to include exam_superintendent (already in roles.ts)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (
  role IN (
    'operator','admin','sysadmin','supervisor','guardian','parent','hod','student',
    'warden','faculty','staff','worker','visitor',
    'caretaker','deputy_warden','hostel_manager','principal','vice_principal','oie','exam_branch',
    'exam_superintendent'
  )
);

-- 2. Add lab_access to permission_requests workflow_type CHECK constraint
ALTER TABLE public.permission_requests DROP CONSTRAINT IF EXISTS permission_requests_workflow_type_check;
ALTER TABLE public.permission_requests ADD CONSTRAINT permission_requests_workflow_type_check
  CHECK (workflow_type IN ('hostel','exam','memo','staff_leave','lab_access'));

-- 3. Seed lab_access custom reasons (if any) and document templates
INSERT INTO public.custom_reasons (code, label, workflow_type)
VALUES
  ('LAB_DEFAULT', 'Default lab access', 'lab_access')
ON CONFLICT (code, workflow_type) DO NOTHING;

-- 4. Create LAB ticket sequence
CREATE SEQUENCE IF NOT EXISTS public.lab_ticket_seq START 1001;

-- 5. Add trigger for lab_access updated_at (already covered by existing trigger on permission_requests)

-- Record migration
INSERT INTO public.schema_migrations (version)
VALUES ('20261110000000')
ON CONFLICT (version) DO NOTHING;
