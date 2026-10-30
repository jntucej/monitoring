-- ── Hardening migration for runtime envelope and critical security items ──────

CREATE INDEX IF NOT EXISTS idx_movement_logs_ts
  ON movement_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_movement_logs_gate_ts
  ON movement_logs (gate_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_movement_logs_user_ts
  ON movement_logs (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_movement_logs_correction
  ON movement_logs (corrected_by_scan_id) WHERE corrected_by_scan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_permreq_status_sla
  ON permission_requests (status, sla_deadline);
CREATE INDEX IF NOT EXISTS idx_sessions_active
  ON sessions (user_id) WHERE revoked_at IS NULL;

CREATE OR REPLACE VIEW movement_logs_v AS
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
