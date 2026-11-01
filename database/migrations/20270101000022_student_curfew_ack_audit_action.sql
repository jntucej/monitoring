-- 20270101000022_student_curfew_ack_audit_action.sql
-- Add CURFEW_ACKNOWLEDGED to the audit_logs known-action constraint
-- (POST /api/student/curfew-acknowledge).
DO $$
DECLARE
  cdef TEXT;
  newdef TEXT;
  lit CONSTANT TEXT := '''';
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO cdef
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
   WHERE t.relname = 'audit_logs'
     AND c.conname = 'audit_logs_action_known'
     AND c.contype = 'c';

  IF cdef IS NULL OR cdef LIKE '%CURFEW_ACKNOWLEDGED%' THEN
    RETURN;
  END IF;

  newdef := replace(cdef, 'ARRAY[', 'ARRAY[' || lit || 'CURFEW_ACKNOWLEDGED' || lit || '::character varying, ');
  IF newdef = cdef THEN
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_action_known';
  EXECUTE 'ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_known ' || newdef;
END $$;
