-- ============================================================================
-- Migration: 20261007000000_mobile_enrollment
-- Purpose: Issue #3 - Add mobile_enrollment_codes table for secure out-of-band mobile enrollment
-- ============================================================================

CREATE TABLE IF NOT EXISTS mobile_enrollment_codes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash      TEXT NOT NULL,          -- bcrypt of the 8-char code
  expires_at     TIMESTAMPTZ NOT NULL,
  used_at        TIMESTAMPTZ,
  used_device_id TEXT,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enroll_user_active
  ON mobile_enrollment_codes (user_id, expires_at)
  WHERE used_at IS NULL;

-- Enable RLS
ALTER TABLE mobile_enrollment_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_mobile_enrollment_codes"
  ON mobile_enrollment_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
