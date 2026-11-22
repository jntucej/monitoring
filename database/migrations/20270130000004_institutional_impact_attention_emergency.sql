-- 20270130000004_institutional_impact_attention_emergency.sql
--
-- PR-08 (ChainImpact) + PR-09 (Executive Attention) + PR-10 (Emergency
-- Command). One migration because they are one loop: a high-impact
-- decision computes its impact preview BEFORE executing (PR-08); the
-- attention engine consumes impact + escalation + SLA + risk and
-- produces the compressed "what needs a principal decision" list
-- (PR-09); emergency commands bypass normal workflows but never bypass
-- authorization + audit (PR-10) and land on the attention queue as
-- CRITICAL.
--
-- Compose, don't fork:
--   * impact_previews.decision_id → decisions.id (PR-06)
--   * attention_items.case_id → cases.id (PR-02); source_kind/source_id
--     references escalation / sla / decision / lockdown rows by id so
--     the attention engine never duplicates their data — it links.
--   * emergency_commands links to the EXISTING lockdown_broadcasts
--     table (the one the gate data plane already reads for IN/OUT
--     gating). The command plane issues an emergency command; the data
--     plane already knows how to act on lockdown_broadcasts. No new
--     broadcast mechanism, no fork.
--   * emergency_states is a column on emergency_commands, not a global
--     table: the institution is in one state at a time, so the current
--     state is "the latest command", not a separate row per level.
--
-- Idempotent: IF NOT EXISTS / ON CONFLICT everywhere; re-runs no-op.
-- Rollback: .down.sql drops in reverse dependency order.

BEGIN;

-- ============================================================
-- PR-08 · impact_previews — the "what will this affect" computed BEFORE
--       execution. A high-impact decision that has no impact_preview
--       row is a blind execution — the engine refuses to run it.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.impact_previews (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id    UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  -- The systems the decision touches: academic_status, exam_eligibility,
  -- gate_permissions, hostel, active_passes, notifications, ...
  systems_affected JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- One row per system: { "system": "gate", "effect": "REVOKED",
  --   "affected_count": 3 }. The shape mirrors PR-01 ImpactEntry[].
  effects        JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- A human-readable summary ("This action affects 8 systems").
  summary        TEXT,
  -- Did the principal/operator confirm the preview before execution?
  -- Until confirmed=true the execution is blocked for high-impact ops.
  confirmed      BOOLEAN NOT NULL DEFAULT FALSE,
  confirmed_by   UUID REFERENCES public.users(id),
  confirmed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_impact_previews_decision ON public.impact_previews (decision_id);

GRANT SELECT, INSERT, UPDATE ON public.impact_previews TO gate_app, admin, authenticated;
GRANT UPDATE, DELETE ON public.impact_previews TO admin;

-- ============================================================
-- PR-09 · attention_items — the compressed "what needs a principal
--       decision" list. Consumes events/cases/escalations/SLAs/risks/
--       decisions/incidents/delegations and produces a severity-ranked
--       item, NOT a raw event dump. The Executive Cockpit (PR-12) is a
--       thin view over these rows.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attention_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- PR-01 AttentionSeverity: INFO | WARNING | CRITICAL.
  severity       TEXT NOT NULL DEFAULT 'INFO'
                 CHECK (severity IN ('INFO','WARNING','CRITICAL')),
  -- Short title ("Gate anomaly at Gate 2", "4 overdue decisions").
  title          TEXT NOT NULL,
  -- The compressed detail (counts, baseline deltas, deadlines).
  detail         TEXT NOT NULL DEFAULT '',
  -- What the item links to (the capability the principal opens next).
  source_kind    TEXT NOT NULL,
  source_id      TEXT NOT NULL,
  -- Which case / domain it belongs to (NULL = institution-wide).
  case_id        UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  -- The recommended action the system proposes.
  recommended_action TEXT,
  -- When this item stops mattering (SLA / expiry / resolution).
  expires_at     TIMESTAMPTZ,
  -- An attention item is actionable until someone resolves it or it
  -- expires; resolved_by/at record the closure.
  resolved       BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by    UUID REFERENCES public.users(id),
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attention_active   ON public.attention_items (severity, created_at DESC) WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_attention_case     ON public.attention_items (case_id);

GRANT SELECT, INSERT, UPDATE ON public.attention_items TO gate_app, admin, authenticated;
GRANT UPDATE, DELETE ON public.attention_items TO admin;

-- ============================================================
-- PR-10 · emergency_commands — the command-plane bypass. Bypasses
--       normal workflows, NEVER bypasses authorization + audit.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.emergency_commands (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The institutional state this command SETS (PR-01 EmergencyState).
  -- The current state is always the latest non-archived command.
  state          TEXT NOT NULL DEFAULT 'ELEVATED'
                 CHECK (state IN ('NORMAL','ELEVATED','CRITICAL','EMERGENCY','LOCKDOWN')),
  -- The authority that issued it (mirrors decisions.authority_source).
  authority_source TEXT NOT NULL DEFAULT 'role'
                 CHECK (authority_source IN ('role','delegation','emergency_override')),
  -- The lockdown_broadcasts row this command issued (the data plane
  -- already reads this for IN/OUT gating). NULL for state-only commands.
  lockdown_id    UUID,
  -- Who + under which hat.
  actor_id       UUID NOT NULL REFERENCES public.users(id),
  actor_role     TEXT NOT NULL,
  role_context   TEXT NOT NULL DEFAULT 'emergency_command',
  -- Why (never just "lockdown" — the reason is stored for post-incident
  -- review, mandatory for every emergency action).
  reason         TEXT NOT NULL,
  -- Scope: which gates / blocks / the whole campus.
  scopes         JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Duration: when the command expires (LOCKDOWN is indefinite until
  -- lifted; ELEVATED/CRITICAL have a max window).
  duration_hours INTEGER,
  -- Post-incident review: the state the command was reviewed in, the
  -- reviewer, and the findings. Mandatory for LOCKDOWN/EMERGENCY.
  review_status  TEXT NOT NULL DEFAULT 'PENDING'
                 CHECK (review_status IN ('PENDING','COMPLETE','WAIVED')),
  reviewed_by    UUID REFERENCES public.users(id),
  reviewed_at    TIMESTAMPTZ,
  review_notes   TEXT,
  archived_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emergency_commands_state   ON public.emergency_commands (state, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_commands_review  ON public.emergency_commands (review_status) WHERE review_status = 'PENDING';

GRANT SELECT, INSERT, UPDATE ON public.emergency_commands TO gate_app, admin, authenticated;
GRANT UPDATE, DELETE ON public.emergency_commands TO admin;

COMMIT;
