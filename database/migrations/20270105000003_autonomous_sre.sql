-- Autonomous SRE: observe -> predict -> decide -> act -> learn.
--
-- The decide phase (policy engine) is the missing piece. This migration
-- adds the schema for all five phases:
--   Phase 1 OBSERVE  -> infra_snapshots (unified health telemetry)
--   Phase 2 PREDICT  -> infra_forecasts (rolling-window forecast rows)
--   Phase 3 DECIDE   -> auto_policies (execution-mode rulebook)
--   Phase 5 LEARN    -> operator_actions.outcome/mttr_seconds/signal_after

BEGIN;

-- ── Phase 1: OBSERVE ─────────────────────────────────────────────────────
-- One source of truth for the predictor, the dashboard, and operator_actions
-- evidence. Collected every 60s by the worker's infra-snapshot job.
CREATE TABLE IF NOT EXISTS public.infra_snapshots (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  db_pool_used         INT,
  db_pool_max          INT,
  queue_depth          INT,
  sse_streams          INT,
  sse_capacity         INT,
  disk_free_pct        NUMERIC(5,2),
  scan_p95_ms          INT,
  error_rate           NUMERIC(6,4),
  backup_age_hours     NUMERIC(8,2),
  container_unhealthy  TEXT[] DEFAULT '{}'::text[]
);
CREATE INDEX IF NOT EXISTS idx_infra_snapshots_captured_at
  ON public.infra_snapshots (captured_at DESC);

-- ── Phase 2: PREDICT ─────────────────────────────────────────────────────
-- A row per forecast. The 5-minute forecaster writes predicted_breach_at,
-- confidence, and the recommended_action; the policy engine reads it.
CREATE TABLE IF NOT EXISTS public.infra_forecasts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal               TEXT NOT NULL,
  predicted_breach_at TIMESTAMPTZ NOT NULL,
  predicted_value      NUMERIC,
  confidence           NUMERIC(3,2) NOT NULL DEFAULT 0.5,
  recommended_action   TEXT NOT NULL,
  evidence             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_infra_forecasts_breach_at
  ON public.infra_forecasts (predicted_breach_at ASC);

-- ── Phase 3: DECIDE ─────────────────────────────────────────────────────
-- Execution-mode rulebook. One row per action_kind; the policy engine reads
-- it to choose auto-execute vs. notify-then-execute vs. request-approval.
CREATE TABLE IF NOT EXISTS public.auto_policies (
  action_kind      TEXT PRIMARY KEY,
  execution_mode   TEXT NOT NULL CHECK (execution_mode IN ('auto','notify','approve')),
  max_attempts     INT NOT NULL DEFAULT 3,
  cooldown_minutes INT NOT NULL DEFAULT 30,
  min_confidence   NUMERIC(3,2) NOT NULL DEFAULT 0.8
);

-- Seed safe defaults (idempotent).
INSERT INTO public.auto_policies (action_kind, execution_mode) VALUES
  ('restart_worker',     'auto'),
  ('prune_backups',      'auto'),
  ('raise_pool_size',    'auto'),
  ('restart_web',        'notify'),
  ('clear_email_queue',  'notify'),
  ('extend_disk',        'approve'),
  ('rotate_db_password', 'approve'),
  ('drop_table',         'approve'),
  ('hard_delete_users',  'approve'),
  ('scale_replicas',     'approve')
ON CONFLICT (action_kind) DO NOTHING;

-- ── Phase 5: LEARN ───────────────────────────────────────────────────────
-- Every operator_actions row becomes incident memory: outcome, MTTR, and the
-- infra snapshot 5 minutes after execution.
ALTER TABLE public.operator_actions
  ADD COLUMN IF NOT EXISTS outcome       TEXT CHECK (outcome IN ('resolved','partial','failed')),
  ADD COLUMN IF NOT EXISTS mttr_seconds INT,
  ADD COLUMN IF NOT EXISTS signal_after JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMIT;

-- RLS + GRANTs for the new tables (gate_app reads/writes through RLS).
ALTER TABLE public.infra_snapshots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infra_forecasts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_policies     ENABLE ROW LEVEL SECURITY;

CREATE POLICY infra_snapshots_gate_app_write ON public.infra_snapshots
  FOR ALL TO gate_app USING (true) WITH CHECK (true);
CREATE POLICY infra_forecasts_gate_app_write ON public.infra_forecasts
  FOR ALL TO gate_app USING (true) WITH CHECK (true);
CREATE POLICY auto_policies_gate_app_select  ON public.auto_policies
  FOR SELECT TO gate_app USING (true);

GRANT SELECT, INSERT, DELETE ON public.infra_snapshots TO gate_app;
GRANT SELECT, INSERT ON public.infra_forecasts TO gate_app;
GRANT SELECT ON public.auto_policies TO gate_app;

GRANT EXECUTE ON FUNCTION public.expire_and_auto_run_operator_actions() TO gate_app;
