-- Batch I3: SLO tracking — 3 SLOs with a per-snapshot burn-rate metric.
--
-- slos: the canonical target list. metric_query is a PromQL expression
-- that returns a single 0..1 availability value in the last evaluation
-- window. The worker's slo_snapshot job evaluates each query against the
-- Prometheus API (MONITORING_PROM_URL) and records the result.
--
-- slo_snapshots: one row per SLO per capture interval. availability is
-- the raw 0..1 value; budget_remaining_pct is the fraction of the
-- window's error budget that has not yet been consumed; burn_rate is
-- how fast the budget is being consumed relative to the target
-- (burn_rate = (1 - availability) / (1 - target)).
BEGIN;

CREATE TABLE IF NOT EXISTS public.slos (
  id            TEXT PRIMARY KEY,
  label         TEXT NOT NULL,
  metric_query  TEXT NOT NULL,
  target        NUMERIC(5,4) NOT NULL DEFAULT 0.9990,
  window_days   INT    NOT NULL DEFAULT 30,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.slos (id, label, metric_query, target, window_days) VALUES
  ('web_availability', 'Public web availability',
   'sum(rate(http_requests_total{status!~"5.."}[5m])) / clamp_min(sum(rate(http_requests_total[5m])), 0.001)',
   0.9990, 30),
  ('scan_availability', 'Gate scan availability',
   'sum(rate(http_requests_total{path=~"/api/gate/scan.*",status!~"5.."}[5m])) / clamp_min(sum(rate(http_requests_total{path=~"/api/gate/scan.*"}[5m])), 0.001)',
   0.9999, 30),
  ('login_latency', 'Login P95 < 800ms',
   '1 - (sum(rate(http_request_duration_seconds_bucket{path="/api/auth/login",le="0.8"}[5m])) / clamp_min(sum(rate(http_request_duration_seconds_count{path="/api/auth/login"}[5m])), 0.001))',
   0.9990, 30)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.slo_snapshots (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slo_id             TEXT NOT NULL REFERENCES public.slos(id) ON DELETE CASCADE,
  captured_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  availability       NUMERIC(6,5) NOT NULL,
  budget_remaining_pct NUMERIC(6,2) NOT NULL,
  burn_rate          NUMERIC(6,2) NOT NULL,
  is_breaching       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_slo_snapshots_slo_time
  ON public.slo_snapshots(slo_id, captured_at DESC);

-- gate_app needs to read slos and write slo_snapshots for the worker job.
GRANT SELECT ON public.slos TO gate_app;
GRANT SELECT, INSERT ON public.slo_snapshots TO gate_app;

COMMIT;
