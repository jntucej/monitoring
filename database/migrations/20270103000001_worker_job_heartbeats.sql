CREATE TABLE IF NOT EXISTS public.worker_job_heartbeats (
  job_name   TEXT PRIMARY KEY,
  last_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_status TEXT NOT NULL DEFAULT 'ok',
  last_error  TEXT,
  runs_total  BIGINT NOT NULL DEFAULT 1
);

COMMENT ON TABLE public.worker_job_heartbeats IS
  'Sentinel rows written by the worker after each scheduled job completes.
   A separate checker (sysadmin / external monitor) alerts when a row goes stale.';

-- gate_app needs read access for the sysadmin jobs API
GRANT SELECT ON public.worker_job_heartbeats TO gate_app;
GRANT INSERT, UPDATE ON public.worker_job_heartbeats TO gate_app;
