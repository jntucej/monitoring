-- 20270130000001_institutional_cases.sql
--
-- PR-02 of the institutional architecture program (see
-- docs/plan/institutional/PR-01-contracts.md for the 15-PR map and
-- manifest). The universal Case system: everything that can require
-- approval or escalation is a case, tracked with its events + evidence,
-- through the shared lifecycle CREATED → OPEN → RESOLVED → CLOSED | CANCELLED.
--
-- Compose, don't fork:
--   * cases.entity_scope mirrors entity_scopes.entity_code (the map the
--     roles already bind to — see 20270115000001)
--   * case_evidence links to existing evidence (audit_events,
--     permission_request documents) rather than forking a new evidence store
--   * case_events carries the same structured fields audit_events does
--     (actor + role_context), so PR-11 audit hardening can fold both in
--   * RLS follows the entity-foundation pattern: gate_app writes the
--     universal tables, admin manages everything, domain tables keep their
--     own RLS — the case layer sits above, not inside, them.
--
-- Idempotent: IF NOT EXISTS / ON CONFLICT everywhere; re-runs are no-ops.
-- Rollback: a .down.sql drops the three tables (domain data untouched —
-- cases reference it, it does not live here).

BEGIN;

-- ============================================================
-- 1. cases — the universal case
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stable human key, e.g. 'HOSTEL-2026-091' (prefix per type, see
  -- src/lib/institutional/contracts.ts CaseType). Unique so a case is
  -- referenceable by people, not just by uuid.
  ref           TEXT UNIQUE NOT NULL,
  -- One of the CaseType values (contracts.ts): gate_pass | hostel_leave |
  -- hostel_discipline | academic_status | exam_integrity | complaint |
  -- security_incident | emergency | delegation | mess | medical.
  type          TEXT NOT NULL,
  -- The subject of the case: a student, a gate, a department, an exam
  -- paper — the type of the entity it is about.
  subject_type  TEXT NOT NULL,
  subject_id    TEXT NOT NULL,
  -- The origin: which system/event created it (a fired policy rule, a
  -- manual request, a webhook). Free text on purpose — PR-13 migrations
  -- add their own origins without a table change.
  origin        TEXT,
  state         TEXT NOT NULL DEFAULT 'CREATED'
                CHECK (state IN ('CREATED','OPEN','RESOLVED','CLOSED','CANCELLED')),
  risk          TEXT NOT NULL DEFAULT 'LOW'
                CHECK (risk IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  -- Authority the case demands: role + role_context (the hat, e.g.
  -- chief_warden). NULL = engine policy decides at transition time.
  authority_role      TEXT,
  authority_context   TEXT,
  -- Bounded scope; mirrors entity_scopes.entity_code (NULL = campus-wide).
  entity_scope        TEXT,
  -- PR-05 attaches sla_instances; the case keeps a denormalized due-by for
  -- the attention engine.
  sla_due_at          TIMESTAMPTZ,
  -- Structured payload (type-specific). Kept jsonb: each migrated domain
  -- owns its own shape (leave_requests, exam results, incident facts).
  payload             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by    UUID REFERENCES public.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_by   UUID REFERENCES public.users(id),
  resolved_at   TIMESTAMPTZ,
  closed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cases_type_state   ON public.cases (type, state);
CREATE INDEX IF NOT EXISTS idx_cases_subject      ON public.cases (subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_cases_scope        ON public.cases (entity_scope);
CREATE INDEX IF NOT EXISTS idx_cases_sla_due      ON public.cases (sla_due_at) WHERE sla_due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_open_risk    ON public.cases (state, risk DESC)
  WHERE state IN ('CREATED','OPEN');

GRANT SELECT, INSERT, UPDATE ON public.cases TO gate_app, admin, authenticated;
GRANT DELETE ON public.cases TO admin;

-- ============================================================
-- 2. case_events — the case's own event stream
-- ============================================================
CREATE TABLE IF NOT EXISTS public.case_events (
  case_id       UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  event_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- What happened: 'created' | 'transitioned' | 'escalated' |
  -- 'evidence_added' | 'decision_requested' | 'resolved' | ...
  event         TEXT NOT NULL,
  -- Structured detail (the before/after for transitions, the evidence
  -- summary, the escalation reason + target).
  detail        JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id      UUID REFERENCES public.users(id),
  actor_type    TEXT NOT NULL DEFAULT 'human' CHECK (actor_type IN ('human','agent','system')),
  -- The hat the actor acted under (contracts.ts RoleContext). Frozen at
  -- write time so the stream is self-describing even if the user's role
  -- changes later.
  role_context  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_events_case_time ON public.case_events (case_id, created_at DESC);

GRANT SELECT, INSERT ON public.case_events TO gate_app, admin, authenticated;
GRANT UPDATE, DELETE ON public.case_events TO admin;

-- ============================================================
-- 3. case_evidence — pointers to existing evidence, not a new store
-- ============================================================
CREATE TABLE IF NOT EXISTS public.case_evidence (
  case_id          UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  evidence_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- What kind of evidence: 'document' | 'audit_event' | 'scan' |
  -- 'leave_request' | 'exam_result' | ...
  kind             TEXT NOT NULL,
  -- The id of the existing record (users.id, audit_logs.id,
  -- leave_requests.id, ...). The case layer never copies evidence rows —
  -- it links them — so the domain tables stay the source of truth.
  reference_id     TEXT NOT NULL,
  note             TEXT,
  added_by         UUID REFERENCES public.users(id),
  added_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_evidence_case ON public.case_evidence (case_id);
CREATE INDEX IF NOT EXISTS idx_case_evidence_ref  ON public.case_evidence (kind, reference_id);

GRANT SELECT, INSERT ON public.case_evidence TO gate_app, admin, authenticated;
GRANT UPDATE, DELETE ON public.case_evidence TO admin;

-- ============================================================
-- 4. updated_at maintenance (same guarded pattern as entity_foundation)
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_cases_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cases_touch_updated ON public.cases;
CREATE TRIGGER cases_touch_updated BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.touch_cases_updated_at();

COMMIT;
