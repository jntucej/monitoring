-- ── Hardening migration for runtime envelope and critical security items ──────
-- 2026-11-03 fix: corrected_by_scan_id was never added to movement_logs
-- (the original migration assumed it existed from the gate scan hardening
-- line). Add it here if missing; all downstream index/view statements are
-- guarded so the whole migration replays cleanly in any order.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'movement_logs' AND column_name = 'corrected_by_scan_id') THEN
    ALTER TABLE public.movement_logs
      ADD COLUMN corrected_by_scan_id UUID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_movement_logs_ts
  ON movement_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_movement_logs_gate_ts
  ON movement_logs (gate_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_movement_logs_user_ts
  ON movement_logs (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_movement_logs_correction
  ON movement_logs (corrected_by_scan_id) WHERE corrected_by_scan_id IS NOT NULL;
DO $$
BEGIN
  -- permission_requests is a plain VIEW in the gate schema (permissions
  -- workflow); it only becomes a real table in the Supabase variant.
  -- information_schema.tables lists base tables AND views, so use pg_class
  -- directly: relkind 'r' = table, 'v' = view.
  IF EXISTS (SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = 'permission_requests' AND c.relkind = 'r') THEN
    CREATE INDEX IF NOT EXISTS idx_permreq_status_sla
      ON permission_requests (status, sla_deadline);
  ELSE
    RAISE NOTICE 'permission_requests is a view in this schema; skipping idx_permreq_status_sla';
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_sessions_active
  ON sessions (user_id) WHERE revoked_at IS NULL;

-- View only when the correction column is in place (guaranteed by the block above).
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
