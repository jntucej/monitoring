-- 20270131000039_usb_backup_hardening.sql
-- Extends the storage_devices + backup tables with hardware identity,
-- mount validation, resource classification, backup locking, and
-- recovery-point protection.
BEGIN;

-- Extend storage_devices with stable hardware identity
ALTER TABLE public.storage_devices
  ADD COLUMN IF NOT EXISTS filesystem_uuid  text,
  ADD COLUMN IF NOT EXISTS device_transport  text
    CHECK (device_transport IN ('usb','sata','nvme','nfs','smb','internal','unknown')),
  ADD COLUMN IF NOT EXISTS last_discovered_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_validated_at  timestamptz,
  ADD COLUMN IF NOT EXISTS last_validation_result text
    CHECK (last_validation_result IN ('passed','failed','mismatch','unreadable','skipped')),
  ADD COLUMN IF NOT EXISTS registered_by      uuid REFERENCES public.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mount_path         text,  -- /mnt/gate-monitor-backup/<device_id>/
  ADD COLUMN IF NOT EXISTS is_mounted         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mount_options      text,
  ADD COLUMN IF NOT EXISTS filesystem_driver  text;   -- 'ntfs-3g', 'ext4', 'nfs4', etc.

-- Unique constraint on hardware identity (serial + uuid combo)
CREATE UNIQUE INDEX IF NOT EXISTS idx_storage_dev_hw_identity
  ON public.storage_devices (device_serial, filesystem_uuid)
  WHERE device_serial IS NOT NULL AND filesystem_uuid IS NOT NULL;

-- Resource classification
CREATE TABLE IF NOT EXISTS public.backup_classifications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_name      text NOT NULL,
  resource_type      text NOT NULL
    CHECK (resource_type IN (
      'postgres','file','config','env_secret','redis','uploads',
      'docker_volume','log','migration','cache','temp','unknown'
    )),
  source_path        text NOT NULL,
  category           text NOT NULL
    CHECK (category IN (
      'critical','important','conditional','reproducible','temporary','unknown','excluded'
    )),
  backup_included    boolean NOT NULL DEFAULT true,
  backup_method      text,
  retention_days     int,
  last_classified_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  last_classified_at timestamptz NOT NULL DEFAULT now(),
  notes              text,
  UNIQUE (resource_name, source_path, category)
);
CREATE INDEX IF NOT EXISTS idx_backup_class_cat ON public.backup_classifications (category, backup_included);

-- Seed the deterministic classification inventory
INSERT INTO public.backup_classifications
  (resource_name, resource_type, source_path, category, backup_included, backup_method, retention_days, notes)
VALUES
  ('gate_monitor-db', 'postgres', 'docker:gate_postgres', 'critical', true,
   'pg_dump -Fc → restic', 30,
   'Primary PostgreSQL application database. All institutional records, attendance, gate movement, auth data.'),
  ('uploads', 'uploads', '/app/data/uploads (volume: uploads_data)', 'critical', true,
   'restic', 30,
   'Uploaded institutional documents. Volume-mounted, persistent.'),
  ('docker-compose.yml', 'config', '/opt/monitoring/compose/docker-compose.yml', 'important', true,
   'restic', 30,
   'Service topology. Rebuildable but version-controlled.'),
  ('env-secrets', 'env_secret', '/opt/monitoring/compose/.env', 'important', true,
   'restic (encrypted at rest)', 30,
   'Application secrets. Encrypted by restic before storage.'),
  ('caddy-config', 'config', '/etc/caddy/Caddyfile', 'important', true,
   'restic', 30,
   'Reverse proxy + TLS configuration.'),
  ('db-migrations', 'migration', '/opt/monitoring/compose/database/migrations/', 'important', true,
   'restic', 90,
   'Schema source-of-truth. Long retention for recovery.'),
  ('grafana-dashboards', 'config', '/opt/monitoring/grafana/provisioning/', 'important', true,
   'restic', 30,
   'Monitoring dashboards and provisioning.'),
  ('loki-data', 'config', '/var/lib/docker/volumes/mon_loki_data/', 'conditional', false,
   'restic (on demand)', 7,
   'Log aggregation. Large; back up only when needed.'),
  ('prometheus-data', 'config', '/var/lib/docker/volumes/mon_prometheus_data/', 'conditional', false,
   'restic (on demand)', 7,
   'Metrics time-series. Rebuildable from retention window.'),
  ('redis-state', 'redis', '/var/lib/docker/volumes/mon_redis_data/', 'conditional', false,
   'restic (on demand)', 7,
   'Redis persistent state + queues. Back up only if durable data exists.'),
  ('docker-images', 'docker_volume', '/var/lib/docker/overlay2/', 'reproducible', false,
   'none', 0,
   'Docker image layers. Rebuildable via docker build. Excluded from backup.'),
  ('node-modules', 'cache', '/opt/monitoring/compose/node_modules/', 'reproducible', false,
   'none', 0,
   'npm install. Excluded.'),
  ('build-cache', 'cache', '/var/lib/docker/buildkit/', 'reproducible', false,
   'none', 0,
   'Docker build cache. Excluded. Pruned by maintenance job.'),
  ('temp-uploads', 'temp', '/opt/monitoring/backups/daily/*.tar.gz', 'temporary', false,
   'retention 30d', 30,
   'Disposable uploads. Retention-managed, not restic-backed.');

-- Backup job locking (prevent concurrent writers)
CREATE TABLE IF NOT EXISTS public.backup_locks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_name   text NOT NULL,
  lock_holder     text NOT NULL,
  lock_acquired_at timestamptz NOT NULL DEFAULT now(),
  lock_expires_at  timestamptz NOT NULL,
  status          text NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','released','expired','failed')),
  UNIQUE (resource_name, lock_holder, lock_acquired_at)
);
CREATE INDEX IF NOT EXISTS idx_backup_locks_active ON public.backup_locks (status, resource_name);

-- Recovery point protection
CREATE TABLE IF NOT EXISTS public.recovery_points (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id      text NOT NULL,
  repository_path  text NOT NULL,
  is_protected     boolean NOT NULL DEFAULT false,
  is_latest_good   boolean NOT NULL DEFAULT false,
  protected_reason text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recovery_points_protected ON public.recovery_points (is_protected, is_latest_good);

COMMIT;
