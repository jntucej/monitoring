-- 20270130000002_institutional_workflows_authority.sql
--
-- PR-03 (Workflow Engine) + PR-04 (Authority Engine) of the institutional
-- architecture program. Two independent subsystems in one migration, kept
-- in the same file because they are deployed together and each references
-- the other's tables (workflow instances record the authority that let
-- them move; authority policies reference the workflow they govern).
--
-- PR-03: workflow_definitions / workflow_instances / workflow_transitions.
-- A case moves through states by looking up its definition, not by
-- hard-coded route logic. transition(case, action) validates current_state,
-- the allowed transition, the actor, the authority, and any conditions.
--
-- PR-04: authority_policies / role_contexts. Separates WHO YOU ARE (role)
-- from WHAT YOU MAY DO (bounded authority). A role alone is never enough
-- to transition a case — the authority engine decides. Every policy is
-- versioned so a decision can cite the exact policy that allowed it.
--
-- Compose, don't fork:
--   * workflow_definitions.state names match the PR-01 WorkflowState set
--   * authority_policies.scope mirrors entity_scopes.entity_code
--   * role_contexts is the registry of hats (contracts.ts RoleContext)
--   * delegation-awareness (an active delegation satisfies a policy that
--     requires a role the delegatee does not directly hold) is a query the
--     authority engine runs, not a table here — it joins
--   * `delegations` (entity_foundation) and `pending_approvals`
--
-- Idempotent: IF NOT EXISTS / ON CONFLICT everywhere; re-runs are no-ops.
-- Rollback: .down.sql drops in reverse dependency order.

BEGIN;

-- ============================================================
-- PR-03 · 1. workflow_definitions — configurable state machines
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workflow_definitions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stable key matching the CaseType (hostel_leave, gate_pass, ...).
  code          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  -- The ordered states the instance walks (PR-01 WorkflowState values,
  -- plus any domain-specific states the migration adds).
  states        JSONB NOT NULL,
  -- from_state -> [action, ...]. transition() consults this, never routes.
  transitions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- action -> role[] that may take it (empty/absent = authority engine decides).
  transition_roles JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  version       INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_defs_active ON public.workflow_definitions (code, is_active);

GRANT SELECT ON public.workflow_definitions TO gate_app, admin, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.workflow_definitions TO admin;

-- Seed the two reference workflows. The gate_pass one mirrors the
-- leave_requests chain already in entity_foundation (DRAFT -> WARDEN_APPROVED
-- -> PARENT_ACKNOWLEDGED -> GATE_ISSUED -> USED) collapsed to the PR-01
-- universal state names. The hostel_leave one is the 4-link chain.
INSERT INTO public.workflow_definitions (code, name, states, transitions, transition_roles, version) VALUES
  ('gate_pass',
   'Gate Pass',
   '["submitted","manager_review","deputy_review","principal_review","approved","rejected","expired"]'::jsonb,
   '{
     "submitted":      ["approve","reject","route_deputy"],
     "manager_review": ["approve","reject","route_deputy"],
     "deputy_review":  ["approve","reject","route_principal"],
     "principal_review":["approve","reject"]
   }'::jsonb,
   '{
     "manager_review": ["operator","supervisor","hostel_manager"],
     "deputy_review":  ["deputy_warden","hostel_manager"],
     "principal_review":["principal"]
   }'::jsonb,
   1),
  ('hostel_leave',
   'Hostel Leave',
   '["submitted","manager_review","deputy_review","principal_review","approved","rejected","expired"]'::jsonb,
   '{
     "submitted":      ["route_manager"],
     "manager_review": ["approve","reject","route_deputy"],
     "deputy_review":  ["approve","reject","route_principal"],
     "principal_review":["approve","reject"]
   }'::jsonb,
   '{
     "manager_review": ["hostel_manager"],
     "deputy_review":  ["deputy_warden"],
     "principal_review":["principal"]
   }'::jsonb,
   1)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, states = EXCLUDED.states,
  transitions = EXCLUDED.transitions, transition_roles = EXCLUDED.transition_roles;

-- ============================================================
-- PR-03 · 2. workflow_instances — a case's place in one definition
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workflow_instances (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id        UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  definition_id  UUID NOT NULL REFERENCES public.workflow_definitions(id),
  current_state  TEXT NOT NULL,
  -- The authority source that let the instance reach this state
  -- (role / delegation:<id> / emergency_override). Frozen per transition.
  authority_source TEXT,
  updated_by     UUID REFERENCES public.users(id),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (case_id, definition_id)
);

CREATE INDEX IF NOT EXISTS idx_wf_instances_case ON public.workflow_instances (case_id);
CREATE INDEX IF NOT EXISTS idx_wf_instances_state ON public.workflow_instances (current_state);

GRANT SELECT, INSERT, UPDATE ON public.workflow_instances TO gate_app, admin, authenticated;
GRANT DELETE ON public.workflow_instances TO admin;

-- ============================================================
-- PR-03 · 3. workflow_transitions — the immutable step log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workflow_transitions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id    UUID NOT NULL REFERENCES public.workflow_instances(id) ON DELETE CASCADE,
  from_state     TEXT NOT NULL,
  to_state       TEXT NOT NULL,
  action         TEXT NOT NULL,
  actor_id       UUID REFERENCES public.users(id),
  -- The hat the actor acted under (frozen, self-describing).
  role_context   TEXT,
  -- Which authority_policies.id allowed this (empty = engine default).
  authority_ids  JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Conditions evaluated at transition time (the policy's bounds).
  conditions_met JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wf_transitions_instance ON public.workflow_transitions (instance_id, created_at DESC);

GRANT SELECT, INSERT ON public.workflow_transitions TO gate_app, admin, authenticated;
GRANT UPDATE, DELETE ON public.workflow_transitions TO admin;

-- ============================================================
-- PR-04 · 1. role_contexts — the registry of institutional hats
-- ============================================================
CREATE TABLE IF NOT EXISTS public.role_contexts (
  context_code  TEXT PRIMARY KEY,
  display_name  TEXT NOT NULL,
  description   TEXT
);

INSERT INTO public.role_contexts (context_code, display_name, description) VALUES
  ('administrative',       'Administrative',   'General institutional operations.'),
  ('chief_warden',         'Chief Warden',     'The warden hat. The principal user acts as the single chief warden.'),
  ('chief_superintendent', 'Chief Superintendent','The examinations hat. Same principal user, different institutional authority.'),
  ('academic',             'Academic',          'Academic-status authority.'),
  ('examinations',         'Examinations',     'Exam-branch authority.'),
  ('security',             'Security',         'Gate / campus-security authority.'),
  ('emergency_command',    'Emergency Command', 'Emergency command-plane authority (bypasses normal workflows, never audit).')
ON CONFLICT (context_code) DO NOTHING;

GRANT SELECT ON public.role_contexts TO gate_app, admin, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.role_contexts TO admin;

-- ============================================================
-- PR-04 · 2. authority_policies — the WHAT-YOU-MAY-DO rules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.authority_policies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stable human key, e.g. 'hostel_leave.approve.hostel_manager'.
  code          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  -- The role that holds the authority.
  role          TEXT NOT NULL,
  -- The hat it is exercised under (role_contexts.context_code). NULL =
  -- no specific context (pure role authority).
  context       TEXT,
  -- The StandardOperation (PR-01) the policy grants.
  operation     TEXT NOT NULL,
  -- The CaseType (PR-01) the policy applies to.
  case_type     TEXT NOT NULL,
  -- Bounded scope. entity_code NULL = campus-wide.
  scope_type    TEXT NOT NULL DEFAULT 'institution',
  scope_code    TEXT,
  -- Bounding conditions (jsonb). E.g. {"max_duration_days": 3} means the
  -- authority only applies to leave requests of at most 3 days.
  bounds        JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Whether the authority may be delegated onward.
  further_delegation_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  version       INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_policies_role ON public.authority_policies (role, case_type, operation);
CREATE INDEX IF NOT EXISTS idx_auth_policies_active ON public.authority_policies (case_type, operation, is_active);

GRANT SELECT ON public.authority_policies TO gate_app, admin, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.authority_policies TO admin;

-- Seed the two reference policies (matching the PR-03 reference workflows).
INSERT INTO public.authority_policies (code, name, role, context, operation, case_type, scope_type, scope_code, bounds, version) VALUES
  ('gate_pass.approve.hostel_manager',
   'Hostel Manager approves gate passes',
   'hostel_manager', NULL, 'approve', 'gate_pass', 'hostel_block', NULL, '{"max_duration_days":3}'::jsonb, 1),
  ('gate_pass.approve.deputy_warden',
   'Deputy Warden approves gate passes',
   'deputy_warden', NULL, 'approve', 'gate_pass', 'campus_wide', NULL, '{"max_duration_days":7}'::jsonb, 1),
  ('gate_pass.approve.principal',
   'Principal approves gate passes (all durations)',
   'principal', NULL, 'approve', 'gate_pass', 'institution', NULL, '{}'::jsonb, 1),
  ('hostel_leave.approve.hostel_manager',
   'Hostel Manager approves hostel leave (<=3 days, their block)',
   'hostel_manager', NULL, 'approve', 'hostel_leave', 'hostel_block', NULL, '{"max_duration_days":3}'::jsonb, 1),
  ('hostel_leave.approve.deputy_warden',
   'Deputy Warden approves hostel leave (<=7 days)',
   'deputy_warden', NULL, 'approve', 'hostel_leave', 'campus_wide', NULL, '{"max_duration_days":7}'::jsonb, 1),
  ('hostel_leave.approve.principal',
   'Principal approves hostel leave (all durations)',
   'principal', NULL, 'approve', 'hostel_leave', 'institution', NULL, '{}'::jsonb, 1),
  ('academic_status.debar.principal',
   'Principal debars a student (all conduct reviews)',
   'principal', 'chief_warden', 'debar', 'academic_status', 'institution', NULL, '{}'::jsonb, 1)
ON CONFLICT (code) DO NOTHING;

GRANT SELECT ON public.authority_policies TO gate_app, admin, authenticated;

COMMIT;
