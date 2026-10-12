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

-- 2. Add lab_access to workflow_type CHECK constraint.
-- permission_requests is a compatibility view over permissions, so the constraint must be
-- applied to the underlying table rather than the view.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'permissions') THEN
    ALTER TABLE public.permissions DROP CONSTRAINT IF EXISTS permissions_workflow_type_check;
    ALTER TABLE public.permissions ADD CONSTRAINT permissions_workflow_type_check
      CHECK (workflow_type IN ('hostel','exam','memo','staff_leave','lab_access'));
  ELSIF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'permission_requests') THEN
    ALTER TABLE public.permission_requests DROP CONSTRAINT IF EXISTS permission_requests_workflow_type_check;
    ALTER TABLE public.permission_requests ADD CONSTRAINT permission_requests_workflow_type_check
      CHECK (workflow_type IN ('hostel','exam','memo','staff_leave','lab_access'));
  END IF;
END $$;

-- 3. Expand custom_reasons workflow_type CHECK to include lab_access
-- The inline CHECK from CREATE TABLE may be auto-named; drop both possible names.
DO $$
BEGIN
  ALTER TABLE public.custom_reasons DROP CONSTRAINT IF EXISTS custom_reasons_workflow_type_check;
  -- PostgreSQL auto-names inline column checks as {table}_{column}_check
  ALTER TABLE public.custom_reasons DROP CONSTRAINT IF EXISTS custom_reasons_check;
  ALTER TABLE public.custom_reasons ADD CONSTRAINT custom_reasons_workflow_type_check
    CHECK (workflow_type IN ('hostel','exam','memo','staff_leave','lab_access'));
END $$;

-- 4. Expand document_templates workflow_type CHECK to include lab_access
DO $$
BEGIN
  ALTER TABLE public.document_templates DROP CONSTRAINT IF EXISTS document_templates_workflow_type_check;
  ALTER TABLE public.document_templates DROP CONSTRAINT IF EXISTS document_templates_check;
  ALTER TABLE public.document_templates ADD CONSTRAINT document_templates_workflow_type_check
    CHECK (workflow_type IN ('hostel','exam','memo','staff_leave','lab_access'));
END $$;

-- 5. Seed lab_access custom reasons
INSERT INTO public.custom_reasons (code, label, workflow_type)
VALUES
  ('LAB_DEFAULT', 'Default lab access', 'lab_access')
ON CONFLICT (code, workflow_type) DO NOTHING;

-- 6. Create LAB ticket sequence
CREATE SEQUENCE IF NOT EXISTS public.lab_ticket_seq START 1001;

-- 7. Add trigger for lab_access updated_at (already covered by existing trigger on permission_requests)

-- Record migration
DO $$
DECLARE
  has_filename BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schema_migrations' AND column_name = 'filename'
  ) INTO has_filename;

  IF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261110000000', '20261110000000_add_lab_access_workflow.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version)
    VALUES ('20261110000000')
    ON CONFLICT (version) DO NOTHING;
  END IF;
END
$$;
