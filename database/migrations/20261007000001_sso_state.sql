-- ============================================================================
-- Migration: 20261007000001_sso_state
-- Purpose: Issue #4 - SSO Authorization State tracking, PKCE verifiers, nonces, and user SSO provenance
-- ============================================================================

CREATE TABLE IF NOT EXISTS sso_authorization_states (
  state         TEXT PRIMARY KEY,
  nonce         TEXT NOT NULL,
  code_verifier TEXT,           -- PKCE verifier
  provider_id   TEXT NOT NULL,
  redirect_to   TEXT,            -- Destination path after login
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  consumed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sso_states_expires
  ON sso_authorization_states (expires_at)
  WHERE consumed_at IS NULL;

-- Enable RLS
ALTER TABLE sso_authorization_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_sso_authorization_states"
  ON sso_authorization_states
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- SSO provenance on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_provider TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_subject  TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_sso_subject
  ON users (sso_provider, sso_subject)
  WHERE sso_subject IS NOT NULL;
