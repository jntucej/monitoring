-- 20270130000005_institutional_audit_hardening.sql
--
-- PR-11 — Audit Hardening.
--
-- The institutional loop (PR-02 case → PR-03 workflow → PR-04 authority →
-- PR-05 escalation → PR-06 decision → PR-07 delegation → PR-08 impact →
-- PR-09 attention → PR-10 emergency) emits audit actions through
-- logAuditEvent(). The audit_logs.action CHECK constraint is a closed
-- set, so each new institutional action must be registered here or the
-- insert is refused (and the audit silently fails, which is exactly the
-- "you cannot reconstruct why a consequential action happened" failure
-- this PR prevents).
--
-- This migration follows the exact pattern established by
-- 20270129000005_academic_workflow_engine.sql §5 (the guarded widening
-- DO-block): read the live constraint def, insert each missing token
-- right after the leading ARRAY[, re-add. Idempotent (skips tokens
-- already present). Never drops pre-existing actions.
--
-- Rollback: a .down.sql removes ONLY the tokens this PR added (re-reads
-- the constraint and strips them). No other action is touched.

BEGIN;

-- ============================================================
-- WIDEN audit_logs.action CHECK for the institutional actions
-- ============================================================
DO $$
DECLARE
  cdef   TEXT;
  action TEXT;
  lit    CONSTANT TEXT := '''';
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
    IF cdef LIKE '%' || action || '%' THEN
      CONTINUE;
    END IF;
    cdef := replace(cdef, 'ARRAY[', 'ARRAY[' || lit || action || lit || '::character varying, ');
    EXECUTE 'ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_action_known';
    EXECUTE 'ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_known ' || cdef;
  END LOOP;
END $$;

-- ============================================================
-- Correlation index: the institutional loop links every step to a
-- decision via decision_no. An index on audit_logs.details->>'decision_no'
-- lets PR-14 (SoD) + the audit ledger reconstruct a whole chain from one
-- decision id without a sequential scan. The column is a JSONB
-- expression index (the details key, not a dedicated column — keeping
-- the table shape unchanged, which the immutability guard expects).
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_decision_no
  ON public.audit_logs ((details->>'decision_no'))
  WHERE details->>'decision_no' IS NOT NULL;

COMMIT;
