-- 20270131000037_backup_and_maintenance_center.sql
BEGIN;

-- 1. backup_policies — configurable backup schedule + retention
CREATE TABLE IF NOT EXISTS public.backup_policies (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL UNIQUE,
  resource_type    text NOT NULL CHECK (resource_type IN (
                     'postgres', 'config', 'uploads', 'redis', 'grafana', 'loki'
                   )),
  schedule_cron    text NOT NULL DEFAULT '0 */6 * * *',
  retention_days   int NOT NULL DEFAULT 30 CHECK (retention_days >= 1),
  enabled          boolean NOT NULL DEFAULT true,
  local_dir        text NOT NULL DEFAULT '/opt/monitoring/backups/daily',
  offsite_enabled  boolean NOT NULL DEFAULT false,
  offsite_bucket   text,
  offsite_prefix   text,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_backup_policies_enabled ON public.backup_policies (enabled) WHERE enabled;

-- 2. backup_executions — every backup run (job state machine)
CREATE TABLE IF NOT EXISTS public.backup_executions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id        uuid REFERENCES public.backup_policies (id) ON DELETE SET NULL,
  resource_type    text NOT NULL,
  status           text NOT NULL DEFAULT 'queued'
                   CHECK (status IN (
                     'queued','running','verifying','uploading','completed',
                     'failed','cancelled','timed_out'
                   )),
  started_at       timestamptz,
  completed_at     timestamptz,
  artifact_path    text,
  artifact_size    bigint,
  checksum_sha256  text,
  local_success    boolean NOT NULL DEFAULT false,
  offsite_success  boolean,
  offsite_bucket   text,
  offsite_key      text,
  error            text,
  worker_id        text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (policy_id, started_at, resource_type)
);
CREATE INDEX IF NOT EXISTS idx_backup_exec_status ON public.backup_executions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_exec_policy ON public.backup_executions (policy_id, created_at DESC);

-- 3. backup_artifacts — physical files on disk or remote
CREATE TABLE IF NOT EXISTS public.backup_artifacts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id     uuid REFERENCES public.backup_executions (id) ON DELETE CASCADE,
  filename         text NOT NULL,
  size_bytes       bigint NOT NULL,
  checksum_sha256  text,
  local_path       text,
  offsite_key      text,
  offsite_bucket   text,
  verified         boolean NOT NULL DEFAULT false,
  verified_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_backup_artifact_exec ON public.backup_artifacts (execution_id);

-- 4. restore_tests — isolated recovery-point verification
CREATE TABLE IF NOT EXISTS public.restore_tests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id     uuid REFERENCES public.backup_executions (id) ON DELETE SET NULL,
  test_type        text NOT NULL DEFAULT 'isolated_pg_restore'
                   CHECK (test_type IN ('isolated_pg_restore','checksum_only','full_recovery_drill')),
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','running','passed','failed','skipped')),
  started_at       timestamptz,
  completed_at     timestamptz,
  result           text,
  error            text,
  duration_ms      int,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_restore_tests_status ON public.restore_tests (status, created_at DESC);

-- 5. maintenance_policies — deterministic auto-maintenance rules
CREATE TABLE IF NOT EXISTS public.maintenance_policies (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL UNIQUE,
  category         text NOT NULL CHECK (category IN (
                     'log_rotation','temp_cleanup','docker_cleanup',
                     'backup_retention','pg_vacuum','redis_health','health_check'
                   )),
  condition_expr   text NOT NULL,
  threshold        text,
  action           text NOT NULL,
  schedule_cron    text NOT NULL DEFAULT '0 */6 * * *',
  max_per_window   int NOT NULL DEFAULT 1,
  resource_limits  jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled          boolean NOT NULL DEFAULT true,
  last_run_at      timestamptz,
  last_result      text,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 6. maintenance_executions
CREATE TABLE IF NOT EXISTS public.maintenance_executions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id        uuid REFERENCES public.maintenance_policies (id) ON DELETE SET NULL,
  status           text NOT NULL DEFAULT 'queued'
                   CHECK (status IN ('queued','running','completed','failed','skipped')),
  started_at       timestamptz,
  completed_at     timestamptz,
  result           text,
  error            text,
  audit_id         uuid,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_maint_exec_policy ON public.maintenance_executions (policy_id, created_at DESC);

-- 7. storage_inventory — discovered persistent resources
CREATE TABLE IF NOT EXISTS public.storage_inventory (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_name    text NOT NULL,
  resource_type    text NOT NULL CHECK (resource_type IN (
                     'docker_volume','docker_image','bind_mount',
                     'persistent_dir','log_dir','cache_dir','database'
                   )),
  location         text NOT NULL,
  classification   text NOT NULL DEFAULT 'unknown'
                   CHECK (classification IN (
                     'critical','important','selective','reproducible','unknown','excluded'
                   )),
  criticality      text NOT NULL DEFAULT 'unknown'
                   CHECK (criticality IN ('critical','important','low','unknown')),
  backup_required  boolean NOT NULL DEFAULT false,
  backup_method    text,
  retention_policy text,
  estimated_size_bytes bigint,
  last_seen_at     timestamptz NOT NULL DEFAULT now(),
  last_backup_at   timestamptz,
  notes            text,
  UNIQUE (resource_name, resource_type, location)
);
CREATE INDEX IF NOT EXISTS idx_storage_inv_class ON public.storage_inventory (classification, criticality);

-- 8. system_maintenance_alerts
CREATE TABLE IF NOT EXISTS public.system_maintenance_alerts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type       text NOT NULL,
  severity         text NOT NULL CHECK (severity IN ('info','warning','critical')),
  message          text NOT NULL,
  source           text NOT NULL DEFAULT 'backup-maintenance',
  status           text NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','acknowledged','resolved')),
  details          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  resolved_at      timestamptz
);
CREATE INDEX IF NOT EXISTS idx_sys_maint_alerts_status ON public.system_maintenance_alerts (status, severity, created_at DESC);

COMMIT;
