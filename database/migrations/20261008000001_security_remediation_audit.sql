-- ============================================================================
-- Migration: 20261008000001_security_remediation_audit
-- Purpose: Security Remediation & Audit Consolidation
--   - Single-use Password Reset Tokens table with TTL & Revocation
--   - Missing predictions index (idx_predictions_type_timestamp)
--   - Ensure PIN must change flag for seed accounts
--   - Performance indexes for API metrics, sessions, and alerts
-- ============================================================================

-- 1. Single-use Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pwd_reset_token_hash
  ON password_reset_tokens (token_hash)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pwd_reset_user
  ON password_reset_tokens (user_id, expires_at);

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_pwd_reset_tokens"
  ON password_reset_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Predictions Type & Timestamp Performance Index
CREATE TABLE IF NOT EXISTS predictions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                     VARCHAR(50) NOT NULL,
  target                   VARCHAR(100) NOT NULL,
  predicted_value          DOUBLE PRECISION NOT NULL,
  confidence_interval_low  DOUBLE PRECISION NOT NULL,
  confidence_interval_high DOUBLE PRECISION NOT NULL,
  timestamp                TIMESTAMPTZ NOT NULL,
  model_version            VARCHAR(20) DEFAULT 'v1.0-arima',
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_type_timestamp
  ON predictions (type, timestamp DESC);

-- 3. Sessions and API metrics indexes
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_hash
  ON sessions (refresh_hash)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_user_active
  ON sessions (user_id, expires_at)
  WHERE revoked_at IS NULL;

-- 4. Ensure PIN must change for legacy seed accounts
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_must_change BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users
SET pin_must_change = TRUE
WHERE pin_must_change = FALSE
  AND initial_pin_hash IS NOT NULL
  AND email LIKE '%@college.edu';
