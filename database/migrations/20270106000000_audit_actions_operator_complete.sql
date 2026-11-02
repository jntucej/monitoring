-- 20270106000000_audit_actions_operator_complete.sql
-- Ensure the audit_logs_action_known constraint accepts the operator-action
-- lifecycle actions the worker/emitter path writes. Without them, the
-- audit-write step in apply-operator-action.sh fails at INSERT time and the
-- action is stuck in 'approved' forever (the worker logs the failure, the
-- sysadmin sees no movement).
--
-- Append-only: this migration ADDS values to the existing CHECK constraint;
-- it never replaces the set, so the one-owner rule stays intact (the owner
-- is 20270101000014; this file is an additive append).
BEGIN;
DO $$
DECLARE
  cdef     TEXT;
  newdef   TEXT;
  lit      CONSTANT TEXT := '''';
  extra    TEXT;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO cdef
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
   WHERE t.relname = 'audit_logs'
     AND c.conname = 'audit_logs_action_known'
     AND c.contype = 'c';

  IF cdef IS NULL THEN
    RAISE EXCEPTION 'audit_logs_action_known constraint missing - apply the owner migration first';
  END IF;

  WITH cand AS (
    SELECT v.val
    FROM (VALUES
      ('OPERATOR_ACTION_EXECUTED'),
      ('OPERATOR_ACTION_FAILED'),
      ('OPERATOR_ACTION_EXPIRED'),
      ('OPERATOR_ACTION_AUTO_EXECUTED')
    ) v(val)
  )
  SELECT string_agg(lit || val || lit, ', ')
    INTO extra
    FROM cand
   WHERE position(lit || val || lit IN cdef) = 0;

  IF extra IS NULL THEN
    RAISE NOTICE 'operator-action audit actions already present';
    RETURN;
  END IF;

  newdef := replace(cdef, 'ARRAY[', 'ARRAY[' || extra || ',');
  IF newdef = cdef THEN
    RAISE EXCEPTION 'could not locate ARRAY[ anchor in constraint definition';
  END IF;

  EXECUTE 'ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_action_known';
  EXECUTE 'ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_known ' || newdef;
  RAISE NOTICE 'appended: %', extra;
END $$;
COMMIT;
