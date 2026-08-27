-- Migration for Scheduled Jobs and Job Runs Tracking
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cron_expression TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL REFERENCES scheduled_jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'RUNNING')),
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pre-populate default system background jobs
INSERT INTO scheduled_jobs (id, name, description, cron_expression, enabled) VALUES
('backfill_daily_stats', 'Daily Gate Statistics Aggregation', 'Aggregates entry/exit statistics per gate every midnight', '0 0 * * *', true),
('cleanup_expired_passes', 'Cleanup Expired Gate Passes', 'Purges or archives expired student outpasses hourly', '0 * * * *', true),
('audit_log_rotation', 'Audit Log Partition Rotation', 'Rotates and archives audit log table partitions weekly', '0 2 * * 0', true),
('biometric_sync_health', 'Biometric & Device Heartbeat Sync', 'Polls hardware turnstiles and syncs biometric templates', '*/15 * * * *', true)
ON CONFLICT (id) DO NOTHING;
