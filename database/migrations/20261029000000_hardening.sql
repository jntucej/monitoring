-- ── Hardening migration for runtime envelope and critical security items ──────

-- corrected_by_scan_id was referenced by indexes/views in this migration but
-- never added to movement_logs (schema.sql baseline lacks it and no earlier
-- migration creates it). Add it here before the index/view that depend on it.
ALTER TABLE movement_logs
  ADD COLUMN IF NOT EXISTS corrected_by_scan_id UUID;

CREATE INDEX IF NOT EXISTS idx_movement_logs_ts
  ON movement_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_movement_logs_gate_ts
  ON movement_logs (gate_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_movement_logs_user_ts
  ON movement_logs (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_movement_logs_correction
  ON movement_logs (corrected_by_scan_id) WHERE corrected_by_scan_id IS NOT NULL;
-- Guard the SLA index with a table + column existence check: the
-- reconciliation migration renames permission_requests -> permissions
-- and creates a back-compat VIEW permission_requests. A composite index
-- on a VIEW cannot be created; if the base table is now `permissions`
-- (reconciliation already ran) create the index on permissions instead,
-- otherwise skip (20261026000001 creates it idempotently when the
-- column first appears).
-- The reconciliation migration (20261026000001) renames permission_requests
-- to permissions and creates a back-compat VIEW permission_requests.
-- information_schema.columns lists view columns too, so the first branch
-- matches the VIEW (not the base table) and tries to index the view, which
-- fails. Fix: check pg_class.relkind = 'r' (regular table, not view) for
-- permission_requests, or check permissions directly as the base table.
DO $$
BEGIN
  -- Base table still named permission_requests (reconciliation not yet run)
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'permission_requests'
      AND c.relkind = 'r'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'permission_requests'
      AND column_name = 'sla_deadline'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_permreq_status_sla
             ON public.permission_requests (status, sla_deadline)';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'permissions'
      AND column_name = 'sla_deadline'
  ) THEN
    -- Reconciliation already renamed the base table to permissions
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_permissions_status_sla
             ON public.permissions (status, sla_deadline)';
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_sessions_active
  ON sessions (user_id) WHERE revoked_at IS NULL;

DROP VIEW IF EXISTS movement_logs_v;
CREATE VIEW movement_logs_v AS
  SELECT * FROM movement_logs WHERE corrected_by_scan_id IS NULL;

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key         text PRIMARY KEY,
  user_id     uuid NOT NULL,
  endpoint    text NOT NULL,
  state       text NOT NULL CHECK (state IN ('processing','done')),
  body        jsonb,
  status      int,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  completed_at timestamptz,
  expires_at  timestamptz
);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys (expires_at);

CREATE TABLE IF NOT EXISTS used_qr_jti (
  jti uuid PRIMARY KEY,
  used_at timestamptz NOT NULL DEFAULT NOW(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_used_qr_jti_expires ON used_qr_jti (expires_at);
