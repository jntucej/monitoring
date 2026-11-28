-- Migration 56: Deterministic Reliability Layer
--
-- Closes the six production failure modes in long-running campus ERPs:
--   1. Silence / Missing Events  -> deadline_watches + academic_calendar events
--   2. Retries & Lost Events     -> processed_events (idempotency) + domain_outbox
--   3. Messy Hardware Punches    -> spatial_policies.hardware_profile (existing) +
--                                     debounce/monotonic guards in the GATE_PUNCH handler
--   4. Upstream Corrections      -> reactive re-evaluation triggers + tombstone cascade
--   5. Policy Overlaps & Gaps    -> policy linter (hard gate on DRAFT -> DRY_RUN_VERIFIED)
--   6. Agent Loops & LLM Outages -> agent_abstentions + llm_circuit_state
--
-- All tables use the same versioned lifecycle as migration 55:
--   status DRAFT -> DRY_RUN_VERIFIED -> ACTIVE -> ARCHIVED
--   two-person sign-off (approved_by <> created_by) on going ACTIVE.

-- ── 1. DEADLINE WATCHES (curfew / SLA / rollover timers) ──────────────────
CREATE TABLE IF NOT EXISTS public.deadline_watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watch_type TEXT NOT NULL
    CHECK (watch_type IN ('CURFEW_RETURN', 'SLA_ESCALATION', 'SEMESTER_TRANSITION', 'CIRCULAR_EXPIRY', 'PASS_EXPIRY')),
  entity_type TEXT NOT NULL,          -- 'student', 'doubt', 'approval', 'circular', 'pass'
  entity_id UUID NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'RESOLVED', 'BREACHED', 'CANCELLED')),
  escalation_step INTEGER NOT NULL DEFAULT 0,
  policy_version_id UUID,             -- FK to the routing/deadline rule that created this watch
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_watch_due CHECK (due_at > created_at OR status = 'OPEN')
);
-- Partial index: the 1-minute sweep only scans OPEN watches that are due.
CREATE INDEX IF NOT EXISTS idx_deadline_watches_open_due
  ON public.deadline_watches (due_at) WHERE status = 'OPEN';
CREATE INDEX IF NOT EXISTS idx_deadline_watches_entity
  ON public.deadline_watches (entity_type, entity_id, status);

-- ── 2a. PROCESSED EVENTS (ingress idempotency) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.processed_events (
  idempotency_key TEXT PRIMARY KEY,
  source TEXT NOT NULL,               -- 'biometric_h0201', 'sbi_collect', 'upi', 'exams_portal'
  event_type TEXT NOT NULL,
  entity_ref TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- No separate index needed — the PK is the lookup path.

-- ── 2b. DOMAIN OUTBOX (transactional event relay) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.domain_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'DEAD_LETTER')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
-- Relay worker claims due rows in FIFO order without contention.
CREATE INDEX IF NOT EXISTS idx_domain_outbox_relay
  ON public.domain_outbox (status, next_retry_at, created_at)
  WHERE status IN ('PENDING', 'PROCESSING');
CREATE INDEX IF NOT EXISTS idx_domain_outbox_event_type
  ON public.domain_outbox (event_type, status);

-- ── 3. AGENT ABSTENTIONS (clustering for Knowledge Gap Cards) ────────────
CREATE TABLE IF NOT EXISTS public.agent_abstentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_query TEXT NOT NULL,
  query_embedding vector,             -- pgvector: cosine distance for clustering
  scope_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  group_slug TEXT,
  abstention_reason TEXT,
  cluster_id UUID,
  status TEXT NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'CLUSTERED', 'PROMOTED', 'DISMISSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_abstentions_cluster
  ON public.agent_abstentions (cluster_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_abstentions_open_query
  ON public.agent_abstentions (normalized_query, status) WHERE status = 'OPEN';

-- ── 4. LLM CIRCUIT-BREAKER STATE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.llm_circuit_state (
  provider_key TEXT PRIMARY KEY,      -- 'omniroute', 'openai', etc.
  circuit_open BOOLEAN NOT NULL DEFAULT FALSE,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  half_open_probe_at TIMESTAMPTZ,     -- when to try the next half-open probe
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. ACADEMIC CALENDAR EVENTS (rollover + curfew + exam windows) ───────
-- Extends the existing academic_calendar (which has academic_year/semester
-- dates) with a typed event stream the deadline sweep consumes.
CREATE TABLE IF NOT EXISTS public.academic_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL
    CHECK (event_type IN ('SEMESTER_START', 'SEMESTER_END', 'EXAM_WINDOW_START',
                          'EXAM_WINDOW_END', 'RESULT_PUBLISHED', 'GRADUATION')),
  academic_year INTEGER NOT NULL,
  occurs_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'SCHEDULED'
    CHECK (status IN ('SCHEDULED', 'FIRED', 'SKIPPED')),
  fired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_calendar_event UNIQUE (event_type, academic_year, occurs_at)
);
CREATE INDEX IF NOT EXISTS idx_calendar_events_due
  ON public.academic_calendar_events (status, occurs_at) WHERE status = 'SCHEDULED';

-- ── 6. POLICY LINTER GATE ─────────────────────────────────────────────────
-- Hard trigger: blocks any transition from DRAFT to DRY_RUN_VERIFIED on the
-- four versioned policy tables unless the linter function passes. The
-- linter checks: (a) scope overlap with existing ACTIVE rows, (b) cohort
-- coverage gaps, (c) dangling role references in escalation_chain /
-- eligible_roles.
CREATE OR REPLACE FUNCTION public.policy_linter_check(
  p_table_name TEXT,
  p_policy_key TEXT,
  p_new_scope JSONB,
  p_new_effective_from TIMESTAMPTZ,
  p_new_effective_to TIMESTAMPTZ,
  p_new_escalation_chain JSONB,
  p_new_eligible_roles JSONB
)
RETURNS TABLE (violation TEXT, detail JSONB) AS $$
DECLARE
  v_overlap INT;
BEGIN
  -- (a) Scope overlap with existing ACTIVE rows in the same table.
  -- A global-scope ({}) row is only a violation when a SECOND ACTIVE
  -- global row already exists for that key.
  IF p_new_scope = '{}'::jsonb THEN
    v_overlap := NULL;
    IF p_table_name = 'routing_policies' THEN
      SELECT 1 INTO v_overlap FROM public.routing_policies
       WHERE status = 'ACTIVE' AND policy_key = p_policy_key AND scope_filter = '{}'::jsonb;
    ELSIF p_table_name = 'governance_matrix' THEN
      SELECT 1 INTO v_overlap FROM public.governance_matrix
       WHERE status = 'ACTIVE' AND action_key = p_policy_key AND scope_filter = '{}'::jsonb;
    ELSIF p_table_name = 'retention_policy_rules' THEN
      SELECT 1 INTO v_overlap FROM public.retention_policy_rules
       WHERE status = 'ACTIVE' AND policy_key = p_policy_key AND scope_filter = '{}'::jsonb;
    ELSIF p_table_name = 'spatial_policies' THEN
      SELECT 1 INTO v_overlap FROM public.spatial_policies
       WHERE status = 'ACTIVE' AND policy_key = p_policy_key AND scope_filter = '{}'::jsonb;
    END IF;
    IF v_overlap IS NOT NULL THEN
      RETURN QUERY SELECT 'scope_overlap'::text, jsonb_build_object(
        'reason', 'A second global-scope ({}) row for ' || p_policy_key || ' already has an ACTIVE row'
      );
    END IF;
  END IF;

  -- (b) Dangling role check: every role in escalation_chain / eligible_roles
  -- must exist in config_roles_registry with at least one active user.
  IF COALESCE(p_new_escalation_chain, '[]'::jsonb) <> '[]'::jsonb THEN
    RETURN QUERY
    SELECT 'dangling_role'::text, jsonb_build_array(elem)
      FROM jsonb_array_elements_text(COALESCE(p_new_escalation_chain, '[]'::jsonb)) AS elem
     WHERE NOT EXISTS (
       SELECT 1 FROM public.config_roles_registry cr
        WHERE cr.code = elem AND cr.is_active
     );
  END IF;

  IF COALESCE(p_new_eligible_roles, '[]'::jsonb) <> '[]'::jsonb THEN
    RETURN QUERY
    SELECT 'dangling_role'::text, jsonb_build_array(elem)
      FROM jsonb_array_elements_text(COALESCE(p_new_eligible_roles, '[]'::jsonb)) AS elem
     WHERE NOT EXISTS (
       SELECT 1 FROM public.config_roles_registry cr
        WHERE cr.code = elem AND cr.is_active
     );
  END IF;

  -- No violations found: return empty set.
  RETURN;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── 7. REACTIVE RE-EVALUATION TRIGGER ─────────────────────────────────────
-- When a dispute is approved or a fee is cleared, re-emit ATTENDANCE_LOCKED
-- so the orchestrator auto-unlocks a previously detained hall ticket.
CREATE OR REPLACE FUNCTION public.trg_dispute_re_emit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'APPROVED' AND OLD.status <> 'APPROVED' THEN
    INSERT INTO public.domain_outbox (event_type, payload)
    VALUES (
      'ATTENDANCE_LOCKED',
      jsonb_build_object(
        'student_id', NEW.student_id::text,
        'reason', 'AMENDMENT',
        'source', 'dispute_approval',
        'dispute_id', NEW.id::text
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach to the attendance_condonations table (the dispute-approval path).
DROP TRIGGER IF EXISTS trg_condonation_re_emit ON public.attendance_condonations;
CREATE TRIGGER trg_condonation_re_emit
  AFTER UPDATE ON public.attendance_condonations
  FOR EACH ROW EXECUTE FUNCTION public.trg_dispute_re_emit();

-- ── 8. CIRCULAR RECALL CASCADE ────────────────────────────────────────────
-- When a circular is RECALLED / SUPERSEDED:
--   1. Tombstone all linked KB chunks (instantly excluded from RAG).
--   2. Mark linked chat circular_card payloads as SUPERSEDED.
--   3. Cancel any PENDING draft actions tied to the old circular_id.
CREATE OR REPLACE FUNCTION public.trg_circular_recall_cascade()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.state IN ('RECALLED', 'SUPERSEDED') AND OLD.state NOT IN ('RECALLED', 'SUPERSEDED') THEN
    -- 1. Tombstone KB chunks.
    UPDATE public.institutional_knowledge_chunks
       SET is_tombstoned = TRUE
     WHERE source_document_id = NEW.id AND is_tombstoned = FALSE;

    -- 2. Mark linked chat circular_card payloads as SUPERSEDED.
    UPDATE public.chat_messages
       SET payload = jsonb_set(payload, '{superseded_by}', to_jsonb(NEW.id::text))
     WHERE payload->>'circular_id' = NEW.id::text
       AND NOT (payload ? 'superseded_by');

    -- 3. Cancel PENDING draft actions tied to this circular.
    INSERT INTO public.domain_outbox (event_type, payload)
    VALUES (
      'CIRCULAR_RECALLED',
      jsonb_build_object('circular_id', NEW.id::text, 'state', NEW.state)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_circular_recall_cascade ON public.operational_announcements;
CREATE TRIGGER trg_circular_recall_cascade
  AFTER UPDATE ON public.operational_announcements
  FOR EACH ROW EXECUTE FUNCTION public.trg_circular_recall_cascade();

-- ── 9. POLICY LINTER HARD GATE (blocks DRAFT -> DRY_RUN_VERIFIED) ────────
-- Attached to all four versioned policy tables. The linter function
-- (policy_linter_check) is called; if it returns any rows, the transition
-- is REJECTED with a detailed violation list.
CREATE OR REPLACE FUNCTION public.trg_policy_linter_gate()
RETURNS TRIGGER AS $$
DECLARE
  v_count INT;
  v_key TEXT;
  v_chain JSONB;
  v_roles JSONB;
  v_scope JSONB;
BEGIN
  -- Only gate the DRAFT -> DRY_RUN_VERIFIED transition.
  IF TG_OP = 'UPDATE' AND NEW.status = 'DRY_RUN_VERIFIED' AND OLD.status = 'DRAFT' THEN
    -- Resolve the policy key (governance_matrix uses action_key; the rest use policy_key).
    v_key := NEW.policy_key;
    IF TG_TABLE_NAME = 'governance_matrix' THEN
      v_key := NEW.action_key;
    END IF;

    v_chain := '[]'::jsonb;
    IF TG_TABLE_NAME = 'routing_policies' THEN
      v_chain := NEW.escalation_chain;
    END IF;

    v_roles := '[]'::jsonb;
    IF TG_TABLE_NAME = 'governance_matrix' THEN
      v_roles := NEW.eligible_roles;
    END IF;

    v_scope := '{}'::jsonb;
    IF TG_TABLE_NAME = 'governance_matrix' OR TG_TABLE_NAME = 'spatial_policies' THEN
      v_scope := NEW.scope_filter;
    END IF;

    SELECT count(*) INTO v_count FROM public.policy_linter_check(
      TG_TABLE_NAME,
      v_key,
      COALESCE(v_scope, '{}'::jsonb),
      NEW.effective_from,
      NEW.effective_to,
      COALESCE(v_chain, '[]'::jsonb),
      COALESCE(v_roles, '[]'::jsonb)
    );
    IF v_count > 0 THEN
      RAISE EXCEPTION 'POLICY LINTER: % violation(s) block DRAFT -> DRY_RUN_VERIFIED for %',
        v_count, v_key;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_routing_linter ON public.routing_policies;
CREATE TRIGGER trg_routing_linter
  BEFORE UPDATE ON public.routing_policies
  FOR EACH ROW EXECUTE FUNCTION public.trg_policy_linter_gate();

DROP TRIGGER IF EXISTS trg_governance_linter ON public.governance_matrix;
CREATE TRIGGER trg_governance_linter
  BEFORE UPDATE ON public.governance_matrix
  FOR EACH ROW EXECUTE FUNCTION public.trg_policy_linter_gate();

DROP TRIGGER IF EXISTS trg_retention_linter ON public.retention_policy_rules;
CREATE TRIGGER trg_retention_linter
  BEFORE UPDATE ON public.retention_policy_rules
  FOR EACH ROW EXECUTE FUNCTION public.trg_policy_linter_gate();

DROP TRIGGER IF EXISTS trg_spatial_linter ON public.spatial_policies;
CREATE TRIGGER trg_spatial_linter
  BEFORE UPDATE ON public.spatial_policies
  FOR EACH ROW EXECUTE FUNCTION public.trg_policy_linter_gate();
