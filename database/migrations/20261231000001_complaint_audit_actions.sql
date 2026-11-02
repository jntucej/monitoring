-- ============================================================================
-- Migration: 20261231000001_complaint_audit_actions
-- Purpose: Add the complaint/audit actions that 20261022000000_complaints_master.sql
--   attempted to register but missed because it runs BEFORE
--   20261027000000_audit_action_canonical.sql creates the
--   audit_logs_action_known constraint (cdef is NULL, block returns early).
--
--   Uses the same dynamic splice pattern as 20261029000001,
--   20261114000001, and 20261201000000.
-- ============================================================================
BEGIN;

DO $$
DECLARE
  cdef   TEXT;
  newdef TEXT;
  extra  TEXT;
  lit    CONSTANT TEXT := '''';
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO cdef
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
   WHERE t.relname = 'audit_logs' AND c.conname = 'audit_logs_action_known' AND c.contype = 'c';

  IF cdef IS NULL THEN
    RAISE EXCEPTION 'audit_logs_action_known constraint missing — run 20261231000000_deception_canary_tokens.sql or 20261027000000_audit_action_canonical.sql first';
  END IF;

  WITH cand AS (
    SELECT v.val
    FROM (VALUES
      ('COMPLAINT_CREATED'),('COMPLAINT_ACKNOWLEDGED'),('COMPLAINT_RESOLVED'),
      ('COMPLAINT_ESCALATED'),('COMPLAINT_REOPENED'),('COMPLAINT_COSIGNED'),
      ('COMPLAINT_ATTACHMENTS_ADDED'),('COMPLAINT_AUTHORITY_CALL'),
      ('ANTI_RAGGING_CASE_FILED'),('SOS_RAISED'),('SOS_RESOLVED'),
      ('DELEGATION_RULE_CREATED'),('MEAL_OPT_OUT_CREATED'),('COMPLAINT_SLA_BREACHED')
    ) v(val)
  )
  SELECT string_agg(lit || val || lit || '::character varying', ', ')
    INTO extra
    FROM cand
   WHERE position(lit || val || lit || '::character varying' IN cdef) = 0;

  IF extra IS NULL THEN
    RAISE NOTICE 'audit_logs_action_known: complaint actions already present, nothing to do';
    RETURN;
  END IF;

  newdef := replace(cdef, 'ARRAY[', 'ARRAY[' || extra || ',');
  IF newdef = cdef THEN
    RAISE NOTICE 'audit_logs_action_known: no ARRAY[ anchor found, leaving unchanged';
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_action_known';
  EXECUTE 'ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_known ' || newdef;
  RAISE NOTICE 'audit_logs_action_known: appended complaint audit actions', extra;
END $$;

-- Self-record (adaptive to 2-col or 4-col schema_migrations)
DO $$
DECLARE
  has_filename BOOLEAN;
  has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schema_migrations'
      AND column_name = 'filename') INTO has_filename;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'schema_migrations'
      AND column_name = 'checksum') INTO has_checksum;
  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('20261231000001',
            '20261231000001_complaint_audit_actions.sql', NOW(),
            md5('20261231000001_complaint_audit_actions'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261231000001',
            '20261231000001_complaint_audit_actions.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261231000001', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;

COMMIT;
