-- 20270129000005_academic_workflow_engine.sql
--
-- The configuration-driven academic workflow engine ("University Brain" kernel).
--
-- Design goal: make the RULES themselves configurable, so institutions control
-- policy (thresholds, routing, escalation, autonomy) without a deploy.
--
-- It composes the existing primitives instead of forking a parallel system:
--   * policy_overrides        (jsonb inheritance) -> used by resolve_policy_value
--   * automation_controls     (kill-switch)       -> used by the automation runtime
--   * config_roles_registry   (role registry)     -> capability scoping
--   * escalation-ladder.ts    (LADDER)            -> escalation routing
--   * audit_events / audit_logs                  -> explain-why + action CHECK widened
--
-- Idempotent: every CREATE uses IF NOT EXISTS; every CHECK widening is a guarded
-- DO-block so re-runs are no-ops.
--
-- ── 1. POLICY ENGINE ────────────────────────────────────────────────────────
-- A policy rule is: WHEN(event/condition) FOR(scope) THEN(action) FOLLOW-UP/
-- ESCALATION, with an autonomy level (L0-L6) and versioning.
-- Scope inherits institution -> department -> program -> year -> class ->
-- subject; the most specific active value wins (config-inheritance, #12).

-- 1a. policy_rules — the automation rule definitions
CREATE TABLE IF NOT EXISTS policy_rules (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- stable human key, e.g. 'attendance_risk_cse'
  code               text UNIQUE NOT NULL,
  name               text NOT NULL,
  -- the triggering event: 'attendance.marked', 'assignment.overdue', ...
  event              text NOT NULL,
  -- scope the rule applies to (inherits downward; most specific active wins).
  -- institution/department/program/year/class/subject + id.
  scope_type         text NOT NULL DEFAULT 'institution',
  scope_id           text,
  -- machine conditions (jsonb) evaluated against the event payload + entity:
  -- { "field":"attendance.percent","op":"<","value":75 } or compound { "and":[...] }
  conditions         jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- machine actions to execute (ordered jsonb array of action descriptors):
  -- [ {"type":"create_case","params":{...}}, {"type":"notify","params":{...}} ]
  actions            jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- follow-up: { "after_hours":48,"if":"unresolved","then":{"type":"escalate","params":{"to":"hod"}} }
  follow_up          jsonb,
  -- escalation override (role to escalate to); NULL => use domain ladder
  escalate_role      text,
  -- autonomy level 0..6 (see AUTONOMY_LEVELS). Default L2 = notify only.
  autonomy_level     integer NOT NULL DEFAULT 2 CHECK (autonomy_level BETWEEN 0 AND 6),
  -- L6+ irreversible / academic-status actions require a human to approve.
  requires_approval  boolean NOT NULL DEFAULT false,
  -- active vs archived (versioning: supersede, don't delete)
  is_active          boolean NOT NULL DEFAULT true,
  version            integer NOT NULL DEFAULT 1,
  created_by         uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- 1b. rule_versions — immutable history (who changed it, when, what diff)
CREATE TABLE IF NOT EXISTS policy_rule_versions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id       uuid NOT NULL REFERENCES policy_rules(id) ON DELETE CASCADE,
  version       integer NOT NULL,
  name          text,
  event         text,
  scope_type    text,
  scope_id      text,
  conditions    jsonb,
  actions       jsonb,
  follow_up     jsonb,
  escalate_role text,
  autonomy_level integer,
  requires_approval boolean,
  changed_by    uuid,
  reason        text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rule_id, version)
);
CREATE INDEX IF NOT EXISTS idx_policy_rule_versions_rule ON policy_rule_versions(rule_id, version DESC);

-- 1c. automation_agents — the AGENT REGISTRY (#17): every autonomous worker
-- gets the same runtime. Existing cron agents (exam-eligibility, faculty-
-- review, class-issue-aggregation) are seeded as rows; new agents register
-- here instead of hard-coding a new file.
CREATE TABLE IF NOT EXISTS automation_agents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text UNIQUE NOT NULL,          -- 'exam-eligibility-manifest'
  name           text NOT NULL,
  purpose        text,
  trigger_type   text NOT NULL DEFAULT 'cron',   -- cron | event | schedule | agent
  trigger_spec   jsonb,                          -- { "cron":"0 6 * * *", "event":"attendance.marked" }
  autonomy_level integer NOT NULL DEFAULT 2 CHECK (autonomy_level BETWEEN 0 AND 6),
  allowed_actions jsonb NOT NULL DEFAULT '[]'::jsonb,  -- capability whitelist
  input_scope    jsonb,                          -- { "department":"CSE" }
  schedule       text,                           -- human-readable
  retry_policy   jsonb,
  requires_approval boolean NOT NULL DEFAULT false,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- 1d. automation_runs — every autonomous execution is recorded with explain-why
CREATE TABLE IF NOT EXISTS automation_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code    text,
  rule_code     text,
  event         text NOT NULL,
  entity_type   text,                            -- 'student' | 'class' | 'assignment'
  entity_id     text,
  outcome       text NOT NULL DEFAULT 'fired',   -- fired | skipped | blocked | escalated | approved
  explanation   jsonb NOT NULL DEFAULT '{}'::jsonb,  -- explain-why (#19): rule, policy, trigger, next escalation
  actions_taken jsonb NOT NULL DEFAULT '[]'::jsonb,
  autonomy_level integer,
  killed_by     text,                            -- automation_controls name that suppressed it
  run_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_runs_agent ON automation_runs(agent_code, run_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_runs_rule ON automation_runs(rule_code, run_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_runs_entity ON automation_runs(entity_type, entity_id, run_at DESC);

-- 1e. automation_approvals — L6 / irreversible + requires_approval gate (#9)
CREATE TABLE IF NOT EXISTS automation_approvals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id         uuid NOT NULL REFERENCES automation_runs(id) ON DELETE CASCADE,
  rule_code      text,
  requested_by   uuid,
  requested_at   timestamptz NOT NULL DEFAULT now(),
  approver_id    uuid,
  approver_role  text,
  decision       text NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending','approved','rejected')),
  decided_at     timestamptz,
  note           text,
  -- two-person rule for academic-status changes (SoD): requires 2 approvers
  approvals_required integer NOT NULL DEFAULT 1
);

-- ── 2. WORKFLOW STATE MACHINES (#8) ────────────────────────────────────────
-- Generalize the marks pipeline (DRAFT->LOCK->PROCESS->SIGN) and the
-- academic-status flow into configurable state machines. Admins configure
-- which transitions are valid + guards + actions.
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   text NOT NULL,                   -- 'marks' | 'assignment' | 'exam' | 'academic_status'
  code          text NOT NULL,                   -- 'marks_pipeline'
  name          text NOT NULL,
  states        jsonb NOT NULL DEFAULT '[]'::jsonb,   -- ["DRAFT","LOCKED","PUBLISHED",...]
  transitions   jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{"from":"DRAFT","to":"LOCKED","guard":"faculty_review_passed","action":"lock"}]
  is_active     boolean NOT NULL DEFAULT true,
  version       integer NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, code)
);

-- ── 3. POLICY INHERITANCE (#12) ───────────────────────────────────────────
-- policy_overrides already holds jsonb keys; the resolver below walks the
-- inheritance chain institution->department->...->subject and returns the
-- most-specific ACTIVE value. This is the "customisable like hell" core:
-- an institution sets a default, a department overrides, a class overrides.
--
-- The helper is exposed to SQL so cron/RLS can resolve a value without app code.

-- Inheritance convention for policy_overrides:
--   key = '<policy_key>'                     -> institution default
--   key = '<policy_key>:department:<DEPT>'   -> department override
--   key = '<policy_key>:program:<PROG>'       -> program override
--   key = '<policy_key>:year:<YEAR>'          -> year override
--   key = '<policy_key>:class:<CLASS>'        -> class override
--   key = '<policy_key>:subject:<SUBJ>'       -> subject override
-- resolve_policy_value walks subject -> class -> year -> program -> department
-- -> institution and returns the most specific ACTIVE value.
CREATE OR REPLACE FUNCTION resolve_policy_value(
  p_key text,
  p_department text DEFAULT NULL,
  p_program text DEFAULT NULL,
  p_year integer DEFAULT NULL,
  p_class text DEFAULT NULL,
  p_subject text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  r jsonb;
BEGIN
  IF p_subject    IS NOT NULL THEN r := (SELECT value_json FROM policy_overrides WHERE key = p_key||':subject:'   ||p_subject);    END IF;
  IF r IS NULL AND p_class    IS NOT NULL THEN r := (SELECT value_json FROM policy_overrides WHERE key = p_key||':class:'     ||p_class);    END IF;
  IF r IS NULL AND p_year     IS NOT NULL THEN r := (SELECT value_json FROM policy_overrides WHERE key = p_key||':year:'      ||p_year::text); END IF;
  IF r IS NULL AND p_program  IS NOT NULL THEN r := (SELECT value_json FROM policy_overrides WHERE key = p_key||':program:'   ||p_program);  END IF;
  IF r IS NULL AND p_department IS NOT NULL THEN r := (SELECT value_json FROM policy_overrides WHERE key = p_key||':department:'||p_department); END IF;
  IF r IS NULL THEN r := (SELECT value_json FROM policy_overrides WHERE key = p_key); END IF;  -- institution default
  RETURN COALESCE(r, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

-- ── 4. AUTONOMY LEVELS registry (#9/#10) ──────────────────────────────────
-- L0 observe / L1 recommend / L2 notify / L3 create task / L4 route /
-- L5 reversible execute / L6 irreversible (approval required).
CREATE TABLE IF NOT EXISTS autonomy_levels (
  level      integer PRIMARY KEY CHECK (level BETWEEN 0 AND 6),
  code        text NOT NULL,
  description text NOT NULL,
  requires_approval boolean NOT NULL DEFAULT false
);
INSERT INTO autonomy_levels (level, code, description, requires_approval) VALUES
  (0, 'observe',      'read-only; log only, no side effects',      false),
  (1, 'recommend',    'produce a recommendation; no execution',     false),
  (2, 'notify',       'send notifications/reminders',               false),
  (3, 'create_task',  'create cases/tasks; no routing',             false),
  (4, 'route',        'assign/escalate to the next actor',         false),
  (5, 'execute_rev',  'execute reversible actions',                 false),
  (6, 'execute_irrev','execute irreversible / academic-status; approval required', true)
ON CONFLICT (level) DO UPDATE SET
  code=EXCLUDED.code, description=EXCLUDED.description, requires_approval=EXCLUDED.requires_approval;

-- ── 5. WIDEN audit_logs.action CHECK for engine actions ───────────────────
-- Registers the academic-workflow-engine audit actions. Uses the exact
-- pattern established by 20270102000004_audit_action_canonical_complete.sql:
-- read the live constraint def, insert each missing token right after ARRAY[,
-- re-add. Idempotent (skips tokens already present). Never drops pre-existing
-- actions — it only ever prepends new tokens into the existing ARRAY.
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
    'policy_rule.create',
    'policy_rule.update',
    'policy_rule.activate',
    'policy_rule.deactivate',
    'policy_rule.version',
    'automation_agent.register',
    'automation_agent.toggle',
    'automation.fired',
    'automation.blocked',
    'automation.escalated',
    'automation.approval_request',
    'automation.approval_decided',
    'workflow_transition',
    'policy_override.set',
    'policy_override.clear',
    'autonomy_level.set'
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

-- ── 6. SEED the existing cron agents into the AGENT REGISTRY ─────────────
-- They keep running on the same runtime; the registry is now the source of
-- truth for their autonomy level + allowed actions (auditable).
INSERT INTO automation_agents (code, name, purpose, trigger_type, autonomy_level, allowed_actions, is_active) VALUES
  ('exam-eligibility-manifest', 'Exam Eligibility Manifest', 'Daily manifest of students eligible to write', 'cron', 4, '["notify","create_task","route"]'::jsonb, true),
  ('class-issue-aggregation',   'Class Issue Aggregation',   'Aggregate N same-category reports into class-level issues + SLA sweep', 'cron', 4, '["create_case","route","notify"]'::jsonb, true),
  ('faculty-review-nudge',      'Faculty Review Nudge',      'Nudge faculty with pending review workloads', 'schedule', 4, '["route","notify"]'::jsonb, true)
ON CONFLICT (code) DO NOTHING;

-- Seed a JNTUH default attendance policy via policy_overrides (institution default).
INSERT INTO policy_overrides (key, value_json, reason, updated_by, updated_at) VALUES
  ('attendance_thresholds',
   '{"warning":75,"critical":60,"grace_weeks":3}','JNTUH default: 75% warning, 60% critical, 3-week grace',
   NULL, now())
ON CONFLICT DO NOTHING;
