-- ============================================================================
-- Migration: 20261007000002_two_factor_and_challenges
-- Purpose: Issue #5 - 2FA columns on users and mfa_login_challenges table
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS two_factor_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS two_factor_secret         TEXT,
  ADD COLUMN IF NOT EXISTS two_factor_enrolled_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS two_factor_recovery_codes TEXT[];

CREATE INDEX IF NOT EXISTS idx_users_2fa_pending
  ON users (role)
  WHERE two_factor_enabled = FALSE
    AND role IN ('sysadmin', 'admin');

CREATE TABLE IF NOT EXISTS mfa_login_challenges (
  id          TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mfa_challenges_user
  ON mfa_login_challenges (user_id, expires_at)
  WHERE used_at IS NULL;

-- Enable RLS
ALTER TABLE mfa_login_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_mfa_login_challenges"
  ON mfa_login_challenges
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
