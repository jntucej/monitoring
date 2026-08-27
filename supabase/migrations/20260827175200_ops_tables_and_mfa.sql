-- Scheduled jobs infrastructure + 2FA columns.
-- Fixes: app code referenced scheduled_jobs, job_runs, users.two_factor_*
-- but none existed in schema, so jobs/2FA silently degraded to fake data.

CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  cron_expression TEXT NOT NULL DEFAULT '0 0 * * *',
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  last_run        TIMESTAMPTZ,
  next_run        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        TEXT NOT NULL REFERENCES scheduled_jobs(id) ON DELETE CASCADE,
  status        TEXT NOT NULL CHECK (status IN ('RUNNING','SUCCESS','FAILED')),
  start_time    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time      TIMESTAMPTZ,
  records_affected BIGINT,
  error_message TEXT
);

ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_runs     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jobs_all_service ON scheduled_jobs;
CREATE POLICY jobs_all_service ON scheduled_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS jobs_read_admin ON scheduled_jobs;
CREATE POLICY jobs_read_admin ON scheduled_jobs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS runs_all_service ON job_runs;
CREATE POLICY runs_all_service ON job_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS runs_read_admin ON job_runs;
CREATE POLICY runs_read_admin ON job_runs FOR SELECT TO authenticated USING (true);

-- TOTP columns (needed by /api/auth/2fa/*)
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO scheduled_jobs (id, name, description, cron_expression) VALUES
  ('backfill_daily_stats', 'Daily Gate Statistics Aggregation', 'Aggregates entry/exit statistics per gate every midnight', '0 0 * * *'),
  ('cleanup_expired_passes', 'Cleanup Expired Gate Passes', 'Archives approved outpasses once their validity window ends', '0 * * * *'),
  ('audit_log_rotation', 'Audit Log Partition Rotation', 'Weekly audit log archival report', '0 2 * * 0')
ON CONFLICT (id) DO NOTHING;
