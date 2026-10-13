-- ============================================================================
-- Migration: 20261110000000_add_lab_access_workflow
-- Purpose: Add Lab Access workflow with LAB ticket prefix, chain-driven approval
-- ============================================================================

-- 1. Expand users.role CHECK constraint to include exam_superintendent (already in roles.ts)
--    Merge into the EXISTING constraint instead of replacing it with a hardcoded
--    list, so roles added by other migrations are never silently dropped.
--    (The previous hardcoded list omitted mess_incharge and any future role.)
DO $$
DECLARE
  cdef   TEXT;
  newdef TEXT;
  lit    CONSTANT TEXT := '''';
  extra  TEXT;
  suffix TEXT;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO cdef
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE t.relname = 'users' AND c.conname = 'users_role_check' AND c.contype = 'c';

  -- Constraint missing entirely → create it from the full role registry.
  IF cdef IS NULL THEN
    ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (
      role IN (
        'operator','admin','sysadmin','supervisor','guardian','parent','hod','student',
        'warden','faculty','staff','worker','visitor',
        'caretaker','deputy_warden','hostel_manager','principal','vice_principal','oie','exam_branch',
        'exam_superintendent','mess_incharge'
      )
    );
    RETURN;
  END IF;

  -- Already patched (idempotent). Match the BARE quoted value — never the
  -- cast suffix, which Postgres renders differently per version
  -- (::text, ::character varying, or no cast at all).
  IF position(lit || 'exam_superintendent' || lit IN cdef) > 0 THEN
    RETURN;
  END IF;

  -- Reuse the cast suffix of the first existing ARRAY LITERAL so the appended
  -- value matches the rest of the definition. Anchored after ARRAY[ so we
  -- capture the literal's cast, not the column's own (role)::text.
  suffix := substring(
    substring(cdef FROM 'ARRAY\[')
    FROM '''[^'']*''(::[a-zA-Z][a-zA-Z0-9_ ]*)'
  );

  IF suffix IS NULL THEN
    suffix := '';
  END IF;

  extra := lit || 'exam_superintendent' || lit || suffix;

  -- The live definition is CHECK (((role)::text = ANY (ARRAY['x'::text, ...])))
  -- or CHECK ((role)::text = ANY (ARRAY['x'::text, ...])). Splice after ARRAY[.
  newdef := replace(cdef, 'ARRAY[', 'ARRAY[' || extra || ',');

  IF newdef = cdef THEN
    RAISE EXCEPTION 'users_role_check: could not locate ARRAY[ anchor; refusing to drop known roles';
  END IF;

  EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT users_role_check';
  EXECUTE 'ALTER TABLE public.users ADD CONSTRAINT users_role_check ' || newdef;
END $$;

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
  has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schema_migrations' AND column_name = 'filename'
  ) INTO has_filename;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schema_migrations' AND column_name = 'checksum'
  ) INTO has_checksum;

  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('20261110000000', '20261110000000_add_lab_access_workflow.sql', NOW(),
            md5('20261110000000_add_lab_access_workflow'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261110000000', '20261110000000_add_lab_access_workflow.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261110000000', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END
$$;
