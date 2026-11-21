-- 20270129000002_widen_audit_actions_class_comm.sql
-- Widen the audit_logs_action_known CHECK with the class-communication
-- capability action values so the kernels can log them. Idempotent: the DO
-- block only inserts the values that are missing from the constraint.

DO $$
DECLARE
  extra_actions TEXT[] := ARRAY[
    'class_request.raise',
    'class_request.resolve',
    'class_request.escalate',
    'class_request.close',
    'class_issue.create',
    'class_issue.resolve',
    'coordinator.appoint',
    'coordinator.revoke',
    'coordinator.extend_request',
    'class_message.publish',
    'class_message.release',
    'class_message.auto_released',
    'class_message.supersede'
  ];
  cdef TEXT;
  lit  TEXT;
  extra TEXT;
  newdef TEXT;
BEGIN
  lit := '''';
  SELECT pg_get_constraintdef(c.oid) INTO cdef
    FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
   WHERE t.relname = 'audit_logs' AND c.conname = 'audit_logs_action_known' AND c.contype = 'c';
  IF cdef IS NULL THEN RETURN; END IF;

  SELECT string_agg(lit || a || lit || '::character varying', ', ') INTO extra
    FROM unnest(extra_actions) a
   WHERE position(lit || a || lit || '::character varying' IN cdef) = 0;
  IF extra IS NULL THEN RETURN; END IF;

  newdef := replace(cdef, 'ARRAY[', 'ARRAY[' || extra || ',');
  IF newdef = cdef THEN RETURN; END IF;
  EXECUTE 'ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_action_known';
  EXECUTE 'ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_known ' || newdef;
END
$$;
