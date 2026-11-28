-- Migration 57: Declarative Execution Kernel
--
-- Separates the generic execution engines (written once in code) from the
-- institutional blueprints (versioned JSON/SQL data). The thin kernel:
--   JSONLogic evaluator, transactional outbox relay, deadline-watch ticker,
--   policy linter, JSON-Schema form renderer. Everything institutional lives
--   in versioned, effective-dated rows in these tables:
--
--   runtime_profiles       - every operational knob (debounce, retry limits,
--                            circuit-breaker thresholds, clustering params)
--   automation_workflows   - ECA (Event-Condition-Action) declarative chains
--   deadline_rules         - declarative deadline templates (curfew, SLA,
--                            library books, fee due dates)
--   integration_adapters   - schema-mapped inbound/outbound adapters
--   program_blueprints     - degree-track definitions (B.Tech, M.Tech, MBA)
--   subject_equivalency_maps - transitory credit/subject lookup for
--                            regulation migration (JJR23 -> JJR27)
--   lifecycle_playbooks    - 1-click annual rollover state graphs

-- ── 1. RUNTIME PROFILES (operational knobs, Zod-validated) ────────────────
CREATE TABLE IF NOT EXISTS public.runtime_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_key TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  environment TEXT NOT NULL DEFAULT 'production'
    CHECK (environment IN ('production', 'staging', 'maintenance', 'drill')),
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  scope_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'DRY_RUN_VERIFIED', 'ACTIVE', 'ARCHIVED')),
  rollback_pointer UUID,
  created_by UUID REFERENCES public.users(id),
  approved_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  CONSTRAINT chk_runtime_window CHECK (effective_to IS NULL OR effective_to > effective_from),
  CONSTRAINT chk_runtime_two_person CHECK (status <> 'ACTIVE' OR (approved_by IS NOT NULL AND approved_by <> created_by)),
  CONSTRAINT uq_runtime_profile_version UNIQUE (profile_key, version)
);
CREATE INDEX IF NOT EXISTS idx_runtime_profiles_active
  ON public.runtime_profiles (profile_key, status, effective_from DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_runtime_single_active
  ON public.runtime_profiles (profile_key) WHERE status = 'ACTIVE';

-- Seed: campus autonomy defaults (the knobs that would otherwise live in .env)
INSERT INTO public.runtime_profiles
  (profile_key, version, environment, config_json, effective_from, status, created_by, approved_by, approved_at)
VALUES
  ('campus_autonomy_defaults', 1, 'production',
   '{
     "hardware_debounce_sec": 300,
     "gps_accuracy_cutoff_m": 30,
     "outbox_max_retries": 5,
     "outbox_backoff_multiplier": 2,
     "abstention_cluster_min_count": 3,
     "abstention_cosine_threshold": 0.15,
     "llm_circuit_fail_sec": 60,
     "llm_half_open_probe_sec": 30,
     "deadline_sweep_interval_sec": 60
   }'::jsonb,
   NOW(), 'ACTIVE',
   (SELECT id FROM public.users WHERE role='principal' LIMIT 1),
   (SELECT id FROM public.users WHERE role='sysadmin' LIMIT 1),
   NOW())
ON CONFLICT (profile_key, version) DO NOTHING;

-- ── 2. AUTOMATION WORKFLOWS (ECA: trigger -> condition -> action chain) ──
CREATE TABLE IF NOT EXISTS public.automation_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_key TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  trigger_event TEXT NOT NULL,
  condition_jsonlogic JSONB NOT NULL DEFAULT '{"==":[1,1]}'::jsonb,
  action_pipeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  retroactive_mode TEXT NOT NULL DEFAULT 'PROSPECTIVE_ONLY'
    CHECK (retroactive_mode IN ('PROSPECTIVE_ONLY', 'PRINCIPAL_RETROACTIVE_OVERRIDE')),
  stop_on_error BOOLEAN NOT NULL DEFAULT TRUE,
  scope_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'DRY_RUN_VERIFIED', 'ACTIVE', 'ARCHIVED')),
  rollback_pointer UUID,
  dry_run_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.users(id),
  approved_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  CONSTRAINT chk_workflow_window CHECK (effective_to IS NULL OR effective_to > effective_from),
  CONSTRAINT chk_workflow_two_person CHECK (status <> 'ACTIVE' OR (approved_by IS NOT NULL AND approved_by <> created_by)),
  CONSTRAINT uq_automation_workflow_version UNIQUE (workflow_key, version)
);
CREATE INDEX IF NOT EXISTS idx_automation_workflows_trigger_active
  ON public.automation_workflows (trigger_event, status, effective_from DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_automation_single_active
  ON public.automation_workflows (workflow_key) WHERE status = 'ACTIVE';

-- Seed: dispute-approved -> re-evaluate + unlock + notify
INSERT INTO public.automation_workflows
  (workflow_key, version, trigger_event, condition_jsonlogic, action_pipeline,
   retroactive_mode, scope_filter, effective_from, status, created_by, approved_by, approved_at)
VALUES
  ('attendance_dispute_re_evaluate', 1, 'DISPUTE_APPROVED',
   '{"and": [{"==": [{"var": "dispute_status"}, "APPROVED"]}, {"in": [{"var": "dispute_kind"}, ["ATTENDANCE", "INTERNAL_MARKS"]]}]}'::jsonb,
   '[
     {"step_id": "recalc", "action_type": "re_evaluate_eligibility", "params": {"source": "AMENDMENT"}, "requires_hitl": false},
     {"step_id": "sync_ticket", "action_type": "sync_hall_ticket_lock", "params": {"auto_unlock_when_eligible": true}, "requires_hitl": false},
     {"step_id": "notify", "action_type": "emit_notification", "params": {"template_key": "eligibility_recomputed", "channels": ["in_app", "sse"]}, "requires_hitl": false}
   ]'::jsonb,
   'PRINCIPAL_RETROACTIVE_OVERRIDE',
   '{"program": "B.Tech"}'::jsonb,
   NOW(), 'DRY_RUN_VERIFIED',
   (SELECT id FROM public.users WHERE role='principal' LIMIT 1),
   (SELECT id FROM public.users WHERE role='sysadmin' LIMIT 1),
   NOW())
ON CONFLICT (workflow_key, version) DO NOTHING;

-- Seed: circular recalled -> tombstone + banner + cancel drafts
INSERT INTO public.automation_workflows
  (workflow_key, version, trigger_event, condition_jsonlogic, action_pipeline,
   retroactive_mode, scope_filter, effective_from, status, created_by, approved_by, approved_at)
VALUES
  ('circular_recall_cascade', 1, 'CIRCULAR_RECALLED',
   '{"==": [{"var": "recall_state"}, "RECALLED"]}'::jsonb,
   '[
     {"step_id": "tombstone", "action_type": "tombstone_rag_chunks", "params": {"source_document_id_var": "circular_id"}, "requires_hitl": false},
     {"step_id": "banner", "action_type": "emit_notification", "params": {"template_key": "circular_superseded", "channels": ["in_app"]}, "requires_hitl": false},
     {"step_id": "cancel", "action_type": "cancel_pending_actions", "params": {"linked_to": "circular_id"}, "requires_hitl": false}
   ]'::jsonb,
   'PROSPECTIVE_ONLY',
   '{}'::jsonb,
   NOW(), 'DRY_RUN_VERIFIED',
   (SELECT id FROM public.users WHERE role='principal' LIMIT 1),
   (SELECT id FROM public.users WHERE role='sysadmin' LIMIT 1),
   NOW())
ON CONFLICT (workflow_key, version) DO NOTHING;

-- ── 3. DEADLINE RULES (declarative curfew / SLA / fee timers) ─────────────
CREATE TABLE IF NOT EXISTS public.deadline_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  open_on_event TEXT NOT NULL,
  close_on_event TEXT,
  due_expression JSONB NOT NULL,
  on_breach_event TEXT NOT NULL,
  condition_jsonlogic JSONB NOT NULL DEFAULT '{"==":[1,1]}'::jsonb,
  scope_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'DRY_RUN_VERIFIED', 'ACTIVE', 'ARCHIVED')),
  rollback_pointer UUID,
  created_by UUID REFERENCES public.users(id),
  approved_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  CONSTRAINT chk_deadline_window CHECK (effective_to IS NULL OR effective_to > effective_from),
  CONSTRAINT chk_deadline_two_person CHECK (status <> 'ACTIVE' OR (approved_by IS NOT NULL AND approved_by <> created_by)),
  CONSTRAINT uq_deadline_rule_version UNIQUE (rule_key, version)
);
CREATE INDEX IF NOT EXISTS idx_deadline_rules_open_event_active
  ON public.deadline_rules (open_on_event, status, effective_from DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_deadline_single_active
  ON public.deadline_rules (rule_key) WHERE status = 'ACTIVE';

-- Seed: curfew deadline (reads official_curfew_time from facilities.config)
INSERT INTO public.deadline_rules
  (rule_key, version, open_on_event, close_on_event, due_expression, on_breach_event,
   scope_filter, effective_from, status, created_by, approved_by, approved_at)
VALUES
  ('hostel_curfew_return', 1, 'GATE_OUT', 'GATE_IN',
   '{"source": "facility.config", "path": "official_curfew_time", "fallback": "21:00"}'::jsonb,
   'CURFEW_OVERDUE',
   '{"campus_zone": "HOSTEL_BLOCK"}'::jsonb,
   NOW(), 'DRY_RUN_VERIFIED',
   (SELECT id FROM public.users WHERE role='principal' LIMIT 1),
   (SELECT id FROM public.users WHERE role='sysadmin' LIMIT 1),
   NOW())
ON CONFLICT (rule_key, version) DO NOTHING;

-- Seed: SLA escalation for routed doubts
INSERT INTO public.deadline_rules
  (rule_key, version, open_on_event, close_on_event, due_expression, on_breach_event,
   scope_filter, effective_from, status, created_by, approved_by, approved_at)
VALUES
  ('doubt_sla_escalation', 1, 'DOUBT_ROUTED', 'DOUBT_ANSWERED',
   '{"source": "routing_policies", "path": "sla_timeout_hours", "plus_hours": 0}'::jsonb,
   'SLA_BREACHED',
   '{}'::jsonb,
   NOW(), 'DRY_RUN_VERIFIED',
   (SELECT id FROM public.users WHERE role='principal' LIMIT 1),
   (SELECT id FROM public.users WHERE role='sysadmin' LIMIT 1),
   NOW())
ON CONFLICT (rule_key, version) DO NOTHING;

-- ── 4. INTEGRATION ADAPTERS (schema-mapped inbound/outbound) ─────────────
CREATE TABLE IF NOT EXISTS public.integration_adapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adapter_key TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND', 'BIDIRECTIONAL')),
  transport_kind TEXT NOT NULL
    CHECK (transport_kind IN ('WEBHOOK_JSON', 'CSV_BATCH', 'REST_POLL', 'SMS_GATEWAY', 'R2_ARCHIVE')),
  auth_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  field_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key_template TEXT NOT NULL,
  outbound_template TEXT,
  validation_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  scope_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'DRY_RUN_VERIFIED', 'ACTIVE', 'ARCHIVED')),
  rollback_pointer UUID,
  created_by UUID REFERENCES public.users(id),
  approved_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  CONSTRAINT chk_adapter_window CHECK (effective_to IS NULL OR effective_to > effective_from),
  CONSTRAINT chk_adapter_two_person CHECK (status <> 'ACTIVE' OR (approved_by IS NOT NULL AND approved_by <> created_by)),
  CONSTRAINT uq_integration_adapter_version UNIQUE (adapter_key, version)
);
CREATE INDEX IF NOT EXISTS idx_integration_adapters_key_active
  ON public.integration_adapters (adapter_key, status, effective_from DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_adapter_single_active
  ON public.integration_adapters (adapter_key) WHERE status = 'ACTIVE';

-- Seed: H0201 biometric terminal (inbound, HMAC-signed webhook)
INSERT INTO public.integration_adapters
  (adapter_key, version, direction, transport_kind, auth_config, field_mapping,
   idempotency_key_template, validation_schema, scope_filter, effective_from,
   status, created_by, approved_by, approved_at)
VALUES
  ('biometric_h0201_punch', 1, 'INBOUND', 'WEBHOOK_JSON',
   '{"mode": "hmac_sha256", "signature_header": "x-terminal-signature", "credential_secret_ref": "H0201_WEBHOOK_SIGNING_SECRET"}'::jsonb,
   '{"terminal_code": "$.deviceId", "external_user_ref": "$.pinOrCardId", "direction": "$.punchType", "occurred_at": "$.timestampIso", "raw_sequence": "$.logIndex"}'::jsonb,
   '{{terminal_code}}:{{occurred_at}}:{{external_user_ref}}:{{raw_sequence}}',
   '{"type": "object", "required": ["deviceId", "pinOrCardId", "punchType", "timestampIso"]}'::jsonb,
   '{"facility_type": "GATE"}'::jsonb,
   NOW(), 'DRY_RUN_VERIFIED',
   (SELECT id FROM public.users WHERE role='principal' LIMIT 1),
   (SELECT id FROM public.users WHERE role='sysadmin' LIMIT 1),
   NOW())
ON CONFLICT (adapter_key, version) DO NOTHING;

-- Seed: SBI Collect / UPI fee webhook (inbound)
INSERT INTO public.integration_adapters
  (adapter_key, version, direction, transport_kind, auth_config, field_mapping,
   idempotency_key_template, validation_schema, scope_filter, effective_from,
   status, created_by, approved_by, approved_at)
VALUES
  ('sbi_collect_upi_fee', 1, 'INBOUND', 'WEBHOOK_JSON',
   '{"mode": "hmac_sha256", "signature_header": "x-sbi-signature", "credential_secret_ref": "SBI_COLLECT_WEBHOOK_SECRET"}'::jsonb,
   '{"utr_ref": "$.utr", "amount_paise": "$.amount", "purpose": "$.merchantCategoryCode", "student_ref": "$.customerRef", "captured_at": "$.timestamp"}'::jsonb,
   '{{utr_ref}}',
   '{"type": "object", "required": ["utr", "amount", "merchantCategoryCode"]}'::jsonb,
   '{}'::jsonb,
   NOW(), 'DRY_RUN_VERIFIED',
   (SELECT id FROM public.users WHERE role='principal' LIMIT 1),
   (SELECT id FROM public.users WHERE role='sysadmin' LIMIT 1),
   NOW())
ON CONFLICT (adapter_key, version) DO NOTHING;

-- ── 5. PROGRAM BLUEPRINTS (degree-track definitions, zero hardcoded) ─────
CREATE TABLE IF NOT EXISTS public.program_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_key TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  program_name TEXT NOT NULL,
  total_semesters INTEGER NOT NULL CHECK (total_semesters > 0),
  max_completion_years INTEGER NOT NULL DEFAULT 8 CHECK (max_completion_years > 0),
  entry_semester INTEGER NOT NULL DEFAULT 1 CHECK (entry_semester >= 1),
  credit_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  attendance_policy_id UUID,
  promotion_rule_id UUID,
  scope_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'DRY_RUN_VERIFIED', 'ACTIVE', 'ARCHIVED')),
  rollback_pointer UUID,
  created_by UUID REFERENCES public.users(id),
  approved_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  CONSTRAINT chk_blueprint_window CHECK (effective_to IS NULL OR effective_to > effective_from),
  CONSTRAINT chk_blueprint_two_person CHECK (status <> 'ACTIVE' OR (approved_by IS NOT NULL AND approved_by <> created_by)),
  CONSTRAINT uq_program_blueprint_version UNIQUE (program_key, version)
);
CREATE INDEX IF NOT EXISTS idx_program_blueprints_active
  ON public.program_blueprints (program_key, status, effective_from DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_program_single_active
  ON public.program_blueprints (program_key) WHERE status = 'ACTIVE';

-- Seed: B.Tech regular (8 semesters, 8-yr completion window, entry sem 1)
INSERT INTO public.program_blueprints
  (program_key, version, program_name, total_semesters, max_completion_years, entry_semester,
   credit_categories, effective_from, status, created_by, approved_by, approved_at)
VALUES
  ('BTECH_REGULAR', 1, 'B.Tech Regular', 8, 8, 1,
   '["core", "elective", "mooc", "project"]'::jsonb,
   NOW(), 'DRY_RUN_VERIFIED',
   (SELECT id FROM public.users WHERE role='principal' LIMIT 1),
   (SELECT id FROM public.users WHERE role='sysadmin' LIMIT 1),
   NOW())
ON CONFLICT (program_key, version) DO NOTHING;

-- Seed: B.Tech Lateral Entry (6 semesters, entry sem 3)
INSERT INTO public.program_blueprints
  (program_key, version, program_name, total_semesters, max_completion_years, entry_semester,
   credit_categories, effective_from, status, created_by, approved_by, approved_at)
VALUES
  ('BTECH_LATERAL', 1, 'B.Tech Lateral Entry', 6, 8, 3,
   '["core", "elective", "project"]'::jsonb,
   NOW(), 'DRY_RUN_VERIFIED',
   (SELECT id FROM public.users WHERE role='principal' LIMIT 1),
   (SELECT id FROM public.users WHERE role='sysadmin' LIMIT 1),
   NOW())
ON CONFLICT (program_key, version) DO NOTHING;

-- ── 6. SUBJECT EQUIVALENCY MAPS (transitory credit lookup) ───────────────
CREATE TABLE IF NOT EXISTS public.subject_equivalency_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_reg_id TEXT NOT NULL,
  from_subject_code TEXT NOT NULL,
  to_reg_id TEXT NOT NULL,
  to_subject_code TEXT NOT NULL,
  credit_delta INTEGER NOT NULL DEFAULT 0,
  bridge_required BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_equivalency UNIQUE (from_reg_id, from_subject_code, to_reg_id, to_subject_code)
);
CREATE INDEX IF NOT EXISTS idx_equivalency_from
  ON public.subject_equivalency_maps (from_reg_id, to_reg_id);

-- ── 7. LIFECYCLE PLAYBOOKS (1-click annual rollover state graphs) ────────
CREATE TABLE IF NOT EXISTS public.lifecycle_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_key TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  trigger_event TEXT NOT NULL,
  state_graph JSONB NOT NULL,
  scope_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'DRY_RUN_VERIFIED', 'ACTIVE', 'ARCHIVED')),
  rollback_pointer UUID,
  created_by UUID REFERENCES public.users(id),
  approved_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  CONSTRAINT chk_playbook_window CHECK (effective_to IS NULL OR effective_to > effective_from),
  CONSTRAINT chk_playbook_two_person CHECK (status <> 'ACTIVE' OR (approved_by IS NOT NULL AND approved_by <> created_by)),
  CONSTRAINT uq_lifecycle_playbook_version UNIQUE (playbook_key, version)
);
CREATE INDEX IF NOT EXISTS idx_lifecycle_playbooks_trigger_active
  ON public.lifecycle_playbooks (trigger_event, status, effective_from DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_playbook_single_active
  ON public.lifecycle_playbooks (playbook_key) WHERE status = 'ACTIVE';

-- Seed: annual rollover playbook
INSERT INTO public.lifecycle_playbooks
  (playbook_key, version, trigger_event, state_graph,
   effective_from, status, created_by, approved_by, approved_at)
VALUES
  ('annual_semester_rollover', 1, 'SEMESTER_START',
   '{"stages": [
     {"id": "clone_sections", "from": "SEMESTER_END", "to": "SEMESTER_START"},
     {"id": "stamp_effective_to", "from": "SEMESTER_START", "to": "COMPLETED"},
     {"id": "activate_scheduled", "from": "SEMESTER_START", "to": "ACTIVE"}
   ], "on_detention": "HOLD_COHORT", "on_completion": "ALUMNI_READONLY"}'::jsonb,
   NOW(), 'DRY_RUN_VERIFIED',
   (SELECT id FROM public.users WHERE role='principal' LIMIT 1),
   (SELECT id FROM public.users WHERE role='sysadmin' LIMIT 1),
   NOW())
ON CONFLICT (playbook_key, version) DO NOTHING;
