-- 20270115000001_entity_foundation.sql
-- Phase 0 entity foundation: entity scopes, audit events, maker-checker
-- approvals, delegation TTL, and the hostel leave-chain state machine.
-- All statements idempotent (IF NOT EXISTS / guarded triggers).

BEGIN;

-- ============================================================
-- 1.1 entity_scopes: the entity map the roles bind to
-- ============================================================
CREATE TABLE IF NOT EXISTS public.entity_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,            -- department | hostel_block | exam_desk | mess | security
  entity_code TEXT NOT NULL,            -- EEE | BOYS_A | CONTROLLER | MESS_MAIN | GATE_1
  display_name TEXT NOT NULL,
  parent_id UUID REFERENCES public.entity_scopes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_code)
);

-- Seed: JNTUH CEJ entity map
INSERT INTO public.entity_scopes (entity_type, entity_code, display_name)
VALUES
  -- 5 B.Tech departments
  ('department', 'EEE', 'EEE Department'),
  ('department', 'ME',  'Mechanical Engineering Department'),
  ('department', 'ECE', 'ECE Department'),
  ('department', 'CSE', 'CSE Department'),
  ('department', 'IT',  'IT Department'),
  -- Science / HSS departments (HOD scope lock extends here)
  ('department', 'PHY', 'Physics Department'),
  ('department', 'CHEM','Chemistry Department'),
  ('department', 'MATH','Mathematics Department'),
  ('department', 'ENG', 'English Department'),
  -- 4 hostel blocks
  ('hostel_block', 'BOYS_A',  'Boys Hostel - Block A'),
  ('hostel_block', 'BOYS_B',  'Boys Hostel - Block B'),
  ('hostel_block', 'GIRLS_A', 'Girls Hostel - Block A'),
  ('hostel_block', 'GIRLS_B', 'Girls Hostel - Block B'),
  -- Exam branch desks (split from single exam_branch)
  ('exam_desk', 'CONTROLLER',   'Controller of Examinations'),
  ('exam_desk', 'ADDL_ACADEMIC','Additional Controller (Academic)'),
  ('exam_desk', 'ADDL_RESULTS', 'Additional Controller (Result Processing)'),
  ('exam_desk', 'ADDL_AUTOMATION','Additional Controller (Automation)'),
  ('exam_desk', 'EXAM_SUPERINTENDENT','Chief Superintendent'),
  -- Mess
  ('mess', 'MESS_MAIN', 'Main Mess (Mess Committee operational lead: mess_incharge)'),
  -- Gate
  ('security', 'GATE_MAIN', 'Main Campus Gate')
ON CONFLICT (entity_type, entity_code) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_scopes TO gate_app, admin, authenticated;

-- ============================================================
-- 1.2 audit_events: structured mutation audit with actor_type
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_events (
  event_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID NOT NULL,
  actor_type    TEXT NOT NULL DEFAULT 'human' CHECK (actor_type IN ('human','agent','system')),
  role_context  TEXT NOT NULL,
  entity_scope  TEXT,                   -- entity_code (denormalized for fast queries)
  action        TEXT NOT NULL,
  resource      TEXT NOT NULL,
  resource_id   TEXT,
  delegation_id UUID,
  before_state  JSONB,
  after_state   JSONB,
  latency_ms    INT,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor_time  ON public.audit_events (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity_time ON public.audit_events (entity_scope, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action_time ON public.audit_events (action, created_at DESC);

GRANT SELECT, INSERT ON public.audit_events TO gate_app, admin, authenticated;
GRANT UPDATE, DELETE ON public.audit_events TO admin;

-- ============================================================
-- 1.3 pending_approvals: maker-checker two-person rule
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pending_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maker_id    UUID NOT NULL,
  checker_id  UUID,                     -- NULL until assigned; must differ from maker_id
  action      TEXT NOT NULL,            -- DEBARRED | SUSPENDED | SYSADMIN_GRANT | MESS_CONTRACTOR_ESCALATION | ...
  resource    TEXT NOT NULL,
  resource_id TEXT,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  status      TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','EXPIRED')),
  reason      TEXT,
  decided_at  TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT maker_ne_checker CHECK (checker_id IS NULL OR maker_id <> checker_id)
);

CREATE INDEX IF NOT EXISTS idx_pending_status ON public.pending_approvals (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_pending_maker   ON public.pending_approvals (maker_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.pending_approvals TO gate_app, admin, authenticated;

-- ============================================================
-- 1.4 delegations: time-bound authority (TTL)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id   UUID NOT NULL REFERENCES public.users(id),
  delegatee_id   UUID NOT NULL REFERENCES public.users(id),
  role           TEXT NOT NULL,
  scope_entity   TEXT,                  -- entity_code; NULL = campus-wide
  can_mutate     BOOLEAN NOT NULL DEFAULT FALSE,
  starts_at      TIMESTAMPTZ NOT NULL,
  expires_at     TIMESTAMPTZ NOT NULL,
  revoked_at     TIMESTAMPTZ,
  requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  approved_by    UUID REFERENCES public.users(id),
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_delegation CHECK (delegator_id <> delegatee_id),
  CONSTRAINT valid_window CHECK (expires_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_delegations_active ON public.delegations (delegatee_id, role, expires_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.delegations TO gate_app, admin, authenticated;

-- ============================================================
-- 1.5 leave_requests: hostel leave chain state machine
-- DRAFT → WARDEN_APPROVED → PARENT_ACKNOWLEDGED → GATE_ISSUED → USED | EXPIRED
--        ↘ REJECTED (at any pre-issuance stage)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES public.users(id),
  hostel_block  TEXT,  -- entity_code of a hostel_block entity_scope (FK by code not unique across types; validated in app layer)
  from_ts       TIMESTAMPTZ NOT NULL,
  to_ts         TIMESTAMPTZ NOT NULL,
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'DRAFT'
                CHECK (status IN ('DRAFT','WARDEN_APPROVED','PARENT_ACKNOWLEDGED','GATE_ISSUED','USED','EXPIRED','REJECTED')),
  warden_approved_by   UUID REFERENCES public.users(id),
  warden_approved_at   TIMESTAMPTZ,
  parent_acknowledged_by UUID REFERENCES public.users(id),
  parent_acknowledged_at TIMESTAMPTZ,
  gate_issued_at  TIMESTAMPTZ,
  gate_jwt        TEXT,
  expires_at      TIMESTAMPTZ,
  rejected_by     UUID REFERENCES public.users(id),
  rejected_at     TIMESTAMPTZ,
  reject_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT leave_window CHECK (to_ts > from_ts)
);

CREATE INDEX IF NOT EXISTS idx_leave_student ON public.leave_requests (student_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_status  ON public.leave_requests (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_leave_block   ON public.leave_requests (hostel_block, status);

GRANT SELECT, INSERT, UPDATE ON public.leave_requests TO gate_app, admin, authenticated;

COMMIT;
