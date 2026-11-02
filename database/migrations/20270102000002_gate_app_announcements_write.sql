-- ============================================================================
-- 20270102000002_gate_app_announcements_write.sql
--
-- Adds the gate_app write policy for announcements (currently only SELECT)
-- and registers ANNOUNCEMENT_CREATED / ANNOUNCEMENT_SCHEDULED as known
-- audit-log actions so the POST /api/admin/announcements audit insert
-- doesn't violate audit_logs_action_known.
-- ============================================================================

-- 1. gate_app write policy for announcements ---------------------------------
DO $$
BEGIN
  IF to_regclass('public.announcements') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS announcements_gate_app_write ON public.announcements';
    EXECUTE 'CREATE POLICY announcements_gate_app_write ON public.announcements
             FOR ALL TO gate_app USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- 2. Register announcement audit actions (idempotent, same pattern as
--    20270101000022_student_curfew_ack_audit_action.sql)
DO $$
DECLARE
  cdef   TEXT;
  newdef TEXT;
  lit    CONSTANT TEXT := '''';
  action TEXT;
BEGIN
  FOREACH action IN ARRAY ARRAY['ANNOUNCEMENT_CREATED','ANNOUNCEMENT_SCHEDULED','ANNOUNCEMENT_UPDATED','ANNOUNCEMENT_PUBLISHED'] LOOP
    SELECT pg_get_constraintdef(c.oid) INTO cdef
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
     WHERE t.relname = 'audit_logs'
       AND c.conname = 'audit_logs_action_known'
       AND c.contype = 'c';

    IF cdef IS NULL OR cdef LIKE '%' || action || '%' THEN
      CONTINUE;
    END IF;

    newdef := replace(cdef, 'ARRAY[', 'ARRAY[' || lit || action || lit || '::character varying, ');
    IF newdef = cdef THEN
      CONTINUE;
    END IF;

    EXECUTE 'ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_action_known';
    EXECUTE 'ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_known ' || newdef;
  END LOOP;
END $$;
