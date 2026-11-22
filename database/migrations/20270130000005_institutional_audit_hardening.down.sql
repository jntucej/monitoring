-- 20270130000005_institutional_audit_hardening.sql (down)
-- Removes ONLY the tokens this PR added to the audit_logs.action CHECK
-- (the inverse of the guarded widening). No other action is touched, and
-- the PR-11 correlation index is dropped. Re-running the forward
-- migration re-adds them (idempotent).

BEGIN;

DO $$
DECLARE
  cdef   TEXT;
  action TEXT;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO cdef
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
   WHERE t.relname = 'audit_logs'
     AND c.conname = 'audit_logs_action_known'
     AND c.contype = 'c';
  IF cdef IS NULL THEN RETURN; END IF;

  FOREACH action IN ARRAY ARRAY[
    'case.created',
    'case.opened',
    'case.resolved',
    'case.closed',
    'case.cancelled',
    'case.escalated',
    'workflow.transitioned',
    'authority.denied',
    'decision.recorded',
    'impact.computed',
    'impact.confirmed',
    'attention.generated',
    'attention.resolved',
    'emergency.command_issued',
    'emergency.reviewed',
    'delegation.granted',
    'delegation.revoked'
  ]
  LOOP
    -- Strip the token + its leading separator (', ' after the preceding
    -- element, or the leading ARRAY[ when it is the first element).
    IF position("'" || action || "'"::varchar || ', ' IN cdef) > 0 THEN
      cdef := replace(cdef, '''' || action || ''', ', '');
    ELSIF position('ARRAY[' || '''' || action || '''' IN cdef) = 1 + 6 THEN
      cdef := substring(cdef from position('::character varying, ', cdef) + 26);
    END IF;
  END LOOP;

  EXECUTE 'ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_action_known';
  EXECUTE 'ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_known ' || cdef;
END $$;

DROP INDEX IF EXISTS public.idx_audit_logs_decision_no;

COMMIT;
