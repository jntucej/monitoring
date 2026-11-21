-- 20270129000003_class_comm_plan.sql
-- Class-communication plan deltas (privacy, lifecycle, SLA, decision packages,
-- smarter aggregation). Idempotent: every section is guarded so a re-run is a
-- no-op. No destructive writes; only additive columns, a new SLA table, a
-- widened CHECK, and widened audit actions.

-- ── 1. class_requests: add the missing lifecycle states ─────────────────
-- waiting_for_student (student must act) + rejected (closed with reason).
-- Widen the status CHECK in place (recreate constraint with the superset).
DO $$
DECLARE
  cdef TEXT;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO cdef
    FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
   WHERE t.relname = 'class_requests'
     AND c.conname = 'class_requests_status_check'
     AND c.contype = 'c';
  IF cdef IS NULL THEN RETURN; END IF;
  IF position('waiting_for_student' IN cdef) > 0
 AND position('rejected' IN cdef) > 0 THEN RETURN; END IF;
  EXECUTE 'ALTER TABLE public.class_requests DROP CONSTRAINT class_requests_status_check';
  EXECUTE format(
    'ALTER TABLE public.class_requests ADD CONSTRAINT class_requests_status_check
       CHECK (status = ANY (ARRAY[%L, %L, %L, %L, %L, %L, %L]::text[]))',
    'open','in_progress','waiting_for_student','escalated','rejected','resolved','closed');
END
$$;

-- Decision package: when a faculty member escalates because they need a
-- decision, they leave a recommendation + what is being asked. Additive
-- columns (NULL = ordinary request, not a decision package).
ALTER TABLE public.class_requests
  ADD COLUMN IF NOT EXISTS decision_required   TEXT,      -- one-line ask
  ADD COLUMN IF NOT EXISTS decision_recommendation TEXT,   -- faculty's recommendation
  ADD COLUMN IF NOT EXISTS decision_evidence   TEXT;       -- supporting detail
-- SLA breach tracking (response SLA).
ALTER TABLE public.class_requests
  ADD COLUMN IF NOT EXISTS sla_due_at          TIMESTAMPTZ;

-- ── 2. Per-category response SLA (institutional service standard) ───────
-- Response hours by category; urgent bypasses the aggregation threshold.
CREATE TABLE IF NOT EXISTS public.class_request_sla (
  category_code   TEXT PRIMARY KEY,
  response_hours  INT  NOT NULL DEFAULT 24,
  escalate_role   TEXT NOT NULL DEFAULT 'hod'
);
INSERT INTO public.class_request_sla (category_code, response_hours, escalate_role) VALUES
  ('GENERAL',    24, 'hod'),
  ('ACADEMIC',   12, 'hod'),
  ('ATTENDANCE', 12, 'hod'),
  ('ROOM',       24, 'hod'),
  ('SUGGESTION', 72, 'hod'),
  ('EXAM',        4, 'oie'),
  ('TIMETABLE',   4, 'vice_principal'),
  ('FACULTY',     4, 'vice_principal'),
  ('URGENT',      1, 'hod')
ON CONFLICT (category_code) DO NOTHING;

-- ── 3. Widen audit actions for the new capabilities ─────────────────────
DO $$
DECLARE
  extra_actions TEXT[] := ARRAY[
    'class_request.wait',
    'class_request.reject',
    'class_request.decision_escalate',
    'class_request.sla_breach'
  ];
  cdef TEXT; lit TEXT; extra TEXT; newdef TEXT;
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
