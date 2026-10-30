-- Splice OPERATOR_GATE_ASSIGNED into the audit_logs_action_known check constraint.
-- Idempotent. Uses the same DO $$ dynamic patch pattern as
-- 20261029000001_audit_bulk_user_import.sql (splice after ARRAY[ or IN ()).
-- Also records this migration in schema_migrations.

DO $$
DECLARE
  cdef   TEXT;
  newdef TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO cdef
  FROM pg_constraint
  WHERE conname = 'audit_logs_action_known';

  -- No constraint yet, or value already present: nothing to do.
  IF cdef IS NULL OR cdef LIKE '%OPERATOR_GATE_ASSIGNED%' THEN
    RETURN;
  END IF;

  -- Preferred anchor: ARRAY['FIRST'::character varying, ...
  newdef := replace(cdef, 'ARRAY[', 'ARRAY[''OPERATOR_GATE_ASSIGNED''::character varying, ');

  -- Fallback anchor: an IN (...) style def.
  IF newdef = cdef THEN
    newdef := replace(cdef, 'IN (', 'IN ( ''OPERATOR_GATE_ASSIGNED'', ');
  END IF;

  IF newdef = cdef THEN
    RAISE NOTICE 'audit_logs_action_known patch: no insert anchor found, leaving constraint unchanged';
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_action_known';
  EXECUTE 'ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_known ' || newdef;
END $$;

-- Record migration in schema_migrations
DO $$
DECLARE
  has_filename BOOLEAN;
  has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'schema_migrations'
      AND column_name = 'filename'
  ) INTO has_filename;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'schema_migrations'
      AND column_name = 'checksum'
  ) INTO has_checksum;

  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES (
      '20270101000003',
      '20270101000003_operator_gate_assignment_audit.sql',
      NOW(),
      md5('20270101000003_operator_gate_assignment_audit')
    )
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES (
      '20270101000003',
      '20270101000003_operator_gate_assignment_audit.sql',
      NOW()
    )
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20270101000003', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
