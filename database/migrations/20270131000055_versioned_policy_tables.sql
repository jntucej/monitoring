-- Migration 55: Versioned Policy-as-Data (Draft -> Dry-Run -> Approve -> Publish)
--
-- Four versioned, effective-dated policy tables so every campus rule can be
-- edited in the admin console with zero source-code changes, survives 5/10/20
-- years of changing regulations/leadership/hardware, and rolls back in 1 click:
--
--   routing_policies       - authority-bridge routing (category, stage_1, chain, SLA, visibility, auto-promote-to-KB)
--   governance_matrix      - approval channel + approver quorum per action (1-click web / single / two-person StepUp)
--   retention_policy_rules - hot/cold TTL per artifact type + trigger + export format (naming avoids the legacy
--                            `retention_policies` table; mirrors `academic_policy_rules`)
--   spatial_policies       - role -> map-layer access + GPS/telemetry hardware baseline
--
-- Shared lifecycle: status DRAFT -> DRY_RUN_VERIFIED -> ACTIVE -> ARCHIVED;
-- rollback_pointer points at the prior row; two-person constraint (approved_by
-- <> created_by) on going ACTIVE; partial-unique index enforces one ACTIVE
-- version per key while DRAFT/DRY_RUN rows for future regulations coexist.
--
-- The IMMUTABLE META-RULE lives here: any edit that downgrades a sensitive
-- action's channel or approver count (e.g. step_up_quorum -> telegram_1click,
-- or 2 -> 1 approvers) is REJECTED by trigger trg_governance_meta_rule unless
-- principal + sysadmin step-up sign-off is recorded in pending_approvals.
-- This is the single hardcoded safeguard; everything else is data.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. AUTHORITY-BRIDGE ROUTING ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.routing_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_key TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  category TEXT NOT NULL CHECK (category IN ('academic', 'hostel', 'exam', 'grievance', 'general')),
  stage_1_role TEXT NOT NULL,
  escalation_chain JSONB NOT NULL DEFAULT '[]'::jsonb,
  sla_timeout_hours INTEGER NOT NULL DEFAULT 24 CHECK (sla_timeout_hours > 0),
  allow_direct_bypass BOOLEAN NOT NULL DEFAULT FALSE,
  reply_visibility TEXT NOT NULL DEFAULT 'dual_constraint_tagged'
    CHECK (reply_visibility IN ('private_dm', 'group_chat', 'dual_constraint_tagged')),
  auto_promote_to_kb BOOLEAN NOT NULL DEFAULT FALSE,
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
  CONSTRAINT chk_routing_effective_window CHECK (effective_to IS NULL OR effective_to > effective_from),
  CONSTRAINT chk_routing_two_person CHECK (status <> 'ACTIVE' OR (approved_by IS NOT NULL AND approved_by <> created_by)),
  CONSTRAINT uq_routing_policy_version UNIQUE (policy_key, version)
);
CREATE INDEX IF NOT EXISTS idx_routing_policies_active_lookup
  ON public.routing_policies (policy_key, status, effective_from DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_routing_single_active
  ON public.routing_policies (policy_key) WHERE status = 'ACTIVE';

-- ── 2. GOVERNANCE MATRIX (approval channel + quorum) ──────────────────────
CREATE TABLE IF NOT EXISTS public.governance_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  channel TEXT NOT NULL CHECK (channel IN ('web_1click', 'web_single', 'step_up_quorum')),
  required_approvers_count INTEGER NOT NULL DEFAULT 1 CHECK (required_approvers_count >= 1),
  eligible_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  require_dry_run BOOLEAN NOT NULL DEFAULT FALSE,
  require_circular_attachment BOOLEAN NOT NULL DEFAULT FALSE,
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
  CONSTRAINT chk_gov_effective_window CHECK (effective_to IS NULL OR effective_to > effective_from),
  CONSTRAINT chk_gov_quorum_channel CHECK (channel <> 'step_up_quorum' OR required_approvers_count >= 2),
  CONSTRAINT chk_gov_two_person CHECK (status <> 'ACTIVE' OR (approved_by IS NOT NULL AND approved_by <> created_by)),
  CONSTRAINT uq_governance_action_version UNIQUE (action_key, version)
);
CREATE INDEX IF NOT EXISTS idx_governance_matrix_active_lookup
  ON public.governance_matrix (action_key, status, effective_from DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_governance_single_active
  ON public.governance_matrix (action_key) WHERE status = 'ACTIVE';

-- Sensitive actions that may NEVER be downgraded without the meta-rule gate:
CREATE TABLE IF NOT EXISTS public.governance_sensitive_actions (
  action_key TEXT PRIMARY KEY,
  reason TEXT
);

-- ── 3. RETENTION POLICY RULES (versioned; named to avoid legacy table) ────
CREATE TABLE IF NOT EXISTS public.retention_policy_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_key TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  artifact_type TEXT NOT NULL
    CHECK (artifact_type IN ('casual_chat', 'circular_card', 'approval_card', 'confirmed_knowledge', 'gate_logs', 'location_history')),
  hot_db_ttl_days INTEGER NOT NULL CHECK (hot_db_ttl_days >= 0),
  cold_r2_ttl_years NUMERIC(5,2) NOT NULL DEFAULT 8.0 CHECK (cold_r2_ttl_years >= 0),
  trigger_event TEXT NOT NULL
    CHECK (trigger_event IN ('scheduled_cron', 'semester_rollover', 'result_published', 'graduation', 'manual_dry_run')),
  export_format TEXT NOT NULL DEFAULT 'encrypted_json'
    CHECK (export_format IN ('encrypted_json', 'parquet', 'jsonl_gz')),
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
  CONSTRAINT chk_retention_effective_window CHECK (effective_to IS NULL OR effective_to > effective_from),
  CONSTRAINT chk_retention_two_person CHECK (status <> 'ACTIVE' OR (approved_by IS NOT NULL AND approved_by <> created_by)),
  CONSTRAINT uq_retention_policy_version UNIQUE (policy_key, version)
);
CREATE INDEX IF NOT EXISTS idx_retention_rules_active_lookup
  ON public.retention_policy_rules (artifact_type, status, effective_from DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_retention_single_active
  ON public.retention_policy_rules (artifact_type) WHERE status = 'ACTIVE';

-- ── 4. SPATIAL + HARDWARE TELEMETRY ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.spatial_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_key TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  role_id TEXT NOT NULL,
  map_layer_access JSONB NOT NULL DEFAULT '["static_wayfinding"]'::jsonb,
  gps_accuracy_cutoff_m NUMERIC(6,2) NOT NULL DEFAULT 30.0 CHECK (gps_accuracy_cutoff_m >= 5.0),
  moving_interval_sec INTEGER NOT NULL DEFAULT 15 CHECK (moving_interval_sec >= 1),
  stationary_interval_sec INTEGER NOT NULL DEFAULT 300 CHECK (stationary_interval_sec >= 5),
  speed_threshold_mps NUMERIC(6,2) NOT NULL DEFAULT 1.5 CHECK (speed_threshold_mps >= 0),
  authoritative_source TEXT NOT NULL DEFAULT 'biometric_terminal'
    CHECK (authoritative_source IN ('biometric_terminal', 'rfid_gate', 'gps_fallback', 'manual_override')),
  hardware_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
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
  CONSTRAINT chk_spatial_effective_window CHECK (effective_to IS NULL OR effective_to > effective_from),
  CONSTRAINT chk_spatial_intervals CHECK (stationary_interval_sec >= moving_interval_sec),
  CONSTRAINT chk_spatial_two_person CHECK (status <> 'ACTIVE' OR (approved_by IS NOT NULL AND approved_by <> created_by)),
  CONSTRAINT uq_spatial_policy_version UNIQUE (policy_key, version)
);
CREATE INDEX IF NOT EXISTS idx_spatial_policies_role_lookup
  ON public.spatial_policies (role_id, status, effective_from DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_spatial_single_active
  ON public.spatial_policies (policy_key) WHERE status = 'ACTIVE';

-- ── META-RULE GUARD (the only hardcoded safeguard) ────────────────────────
-- Reject any INSERT/UPDATE on governance_matrix that:
--   (a) touches a sensitive action_key AND
--   (b) downgrades it (channel no longer step_up_quorum, OR approver count drops below the
--       prior/minimum), UNLESS a principal + sysadmin two-person step-up
--       sign-off row is recorded in pending_approvals.
CREATE OR REPLACE FUNCTION public.trg_governance_meta_rule()
RETURNS TRIGGER AS $$
DECLARE
  v_sensitive BOOLEAN;
  v_downgraded BOOLEAN;
  v_prev_approvers INTEGER;
  v_prev_channel TEXT;
  v_quorum_ok BOOLEAN;
BEGIN
  -- Only the INSERT or UPDATE path for sensitive actions needs checking.
  IF TG_OP = 'INSERT' THEN
    IF NEW.action_key IN (SELECT action_key FROM public.governance_sensitive_actions) THEN
      -- A brand-new row for a sensitive action must already be step_up_quorum
      -- with >=2 approvers; the meta-rule gate is enforced at the API layer
      -- (principal+sysadmin step-up) and recorded in pending_approvals.
      IF NEW.channel <> 'step_up_quorum' OR NEW.required_approvers_count < 2 THEN
        RAISE EXCEPTION 'META-RULE: sensitive action % may only be governed by step_up_quorum with >=2 approvers', NEW.action_key;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT true INTO v_sensitive WHERE NEW.action_key IN (SELECT action_key FROM public.governance_sensitive_actions);
    IF NOT COALESCE(v_sensitive, false) THEN
      RETURN NEW;
    END IF;

    SELECT required_approvers_count, channel INTO v_prev_approvers, v_prev_channel
      FROM public.governance_matrix
     WHERE id = OLD.id LIMIT 1;

    v_downgraded := (NEW.channel <> 'step_up_quorum' AND OLD.channel = 'step_up_quorum')
                 OR (COALESCE(NEW.required_approvers_count, 1) < COALESCE(OLD.required_approvers_count, 1))
                 OR (NEW.required_approvers_count < 2 AND OLD.action_key IN (SELECT action_key FROM public.governance_sensitive_actions));

    IF v_downgraded THEN
      -- Require recorded principal + sysadmin two-person step-up sign-off.
      -- pending_approvals stores maker_id + checker_id (two-person); we
      -- resolve their roles from users and require both to be one of
      -- {principal, sysadmin}.
      SELECT EXISTS (
        SELECT 1
          FROM public.pending_approvals pa
          JOIN public.users mu ON mu.id = pa.maker_id
          JOIN public.users cu ON cu.id = pa.checker_id
         WHERE pa.status = 'APPROVED'
           AND pa.action = 'update_governance_matrix'
           AND pa.payload::text LIKE '%' || NEW.action_key || '%'
           AND (mu.role IN ('principal','sysadmin') AND cu.role IN ('principal','sysadmin'))
      ) INTO v_quorum_ok;
      IF NOT COALESCE(v_quorum_ok, false) THEN
        RAISE EXCEPTION 'META-RULE VIOLATION: downgrading sensitive action % (channel/approvers) requires a recorded principal+sysadmin two-person step-up in pending_approvals (action=update_governance_matrix)', NEW.action_key;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_governance_meta_rule ON public.governance_matrix;
CREATE TRIGGER trg_governance_meta_rule
  BEFORE INSERT OR UPDATE ON public.governance_matrix
  FOR EACH ROW EXECUTE FUNCTION public.trg_governance_meta_rule();

-- ── Seed sensitive actions (never auto-expandable by data) ───────────────
INSERT INTO public.governance_sensitive_actions (action_key, reason) VALUES
  ('debar_student', 'DEBARRED status toggles - two-person quorum'),
  ('publish_regulation', 'JJR23 -> JJR27 publication - principal only'),
  ('campus_lockdown', 'campus/block lockdown + lift - StepUpModal'),
  ('update_governance_matrix', 'the meta-rule itself - principal + sysadmin'),
  ('edit_thresholds', 'attendance/detention thresholds + condonation fee slabs'),
  ('rbac_edit', 'RBAC role permission edits - break-glass')
ON CONFLICT (action_key) DO NOTHING;
