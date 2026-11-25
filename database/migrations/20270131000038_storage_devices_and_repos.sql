-- 20270131000038_storage_devices_and_repos.sql
-- Hardware storage device registry + restic repository tracking
BEGIN;

-- Registered physical / network storage devices
CREATE TABLE IF NOT EXISTS public.storage_devices (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_name           text NOT NULL,                -- "WD My Passport"
  device_model          text,                         -- "WDC WD20JDRW-11C7VS1"
  device_serial         text,                         -- "WD-WX22AC5AFYLK"
  device_type           text NOT NULL CHECK (device_type IN (
                          'usb_hdd','usb_ssd','internal_sata','internal_nvme',
                          'nas_nfs','nas_smb','network','local_dir'
                       )),
  mount_point           text NOT NULL,                -- "/mnt/external-logs"
  filesystem            text,                         -- "ntfs", "ext4", "nfs4"
  total_bytes           bigint,
  available_bytes       bigint,
  last_seen_at          timestamptz NOT NULL DEFAULT now(),
  is_primary_backup     boolean NOT NULL DEFAULT false,
  eligible_for_backup   boolean NOT NULL DEFAULT true,
  read_writable         boolean NOT NULL DEFAULT true,
  health_status         text NOT NULL DEFAULT 'unknown'
                       CHECK (health_status IN ('healthy','degraded','error','disconnected','unknown')),
  last_backup_at        timestamptz,
  last_verify_at        timestamptz,
  notes                 text,
  registered_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mount_point)
);
CREATE INDEX IF NOT EXISTS idx_storage_dev_primary ON public.storage_devices (is_primary_backup);

-- Restic snapshot records (independent of physical device state)
CREATE TABLE IF NOT EXISTS public.repos_snapshots (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id      text NOT NULL,                     -- restic short ID
  repository_path  text NOT NULL,
  device_id        uuid REFERENCES public.storage_devices (id) ON DELETE SET NULL,
  tag              text,
  time             timestamptz,
  paths            text[],
  stats_json       jsonb NOT NULL DEFAULT '{}'::jsonb, -- files_new, bytes_added, etc.
  checksum_verified boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_repos_snap_repo ON public.repos_snapshots (repository_path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_repos_snap_id   ON public.repos_snapshots (snapshot_id);

-- Backup manifests (one row per one-click backup run)
CREATE TABLE IF NOT EXISTS public.backup_manifests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id           text NOT NULL UNIQUE,               -- timestamp-based
  started_at       timestamptz NOT NULL,
  completed_at     timestamptz,
  status           text NOT NULL DEFAULT 'running'
                   CHECK (status IN ('running','completed','failed','partial','interrupted')),
  primary_device   uuid REFERENCES public.storage_devices (id) ON DELETE SET NULL,
  critical_ok      boolean NOT NULL DEFAULT false,
  important_ok     boolean NOT NULL DEFAULT false,
  resources_total  int NOT NULL DEFAULT 0,
  resources_ok     int NOT NULL DEFAULT 0,
  resources_failed int NOT NULL DEFAULT 0,
  total_bytes      bigint NOT NULL DEFAULT 0,
  dedup_ratio      numeric(5,2),
  checksum_sha256  text,
  error            text,
  resource_details jsonb NOT NULL DEFAULT '[]'::jsonb
  -- each item: {name, category, status, bytes, error}
);
CREATE INDEX IF NOT EXISTS idx_backup_manifests_status ON public.backup_manifests (status, completed_at DESC);

-- Seed the Western Digital My Passport as the registered primary backup device
INSERT INTO public.storage_devices (
  device_name, device_model, device_serial, device_type,
  mount_point, filesystem, total_bytes, available_bytes,
  is_primary_backup, eligible_for_backup, read_writable,
  health_status, notes
) VALUES (
  'WD My Passport',
  'WDC WD20JDRW-11C7VS1',
  'WD-WX22AC5AFYLK',
  'usb_hdd',
  '/mnt/external-logs',
  'ntfs',
  1907949385728,  -- 1.8 TB total
  1907949385728,  -- ~all available
  true,           -- primary
  true,           -- backup eligible
  true,           -- read-writable
  'healthy',
  'Registered Western Digital My Passport 1.8TB USB HDD. Primary restic backup destination.'
)
ON CONFLICT (mount_point) DO UPDATE SET
  device_name = EXCLUDED.device_name,
  device_model = EXCLUDED.device_model,
  is_primary_backup = true,
  eligible_for_backup = true,
  last_seen_at = NOW();

COMMIT;
