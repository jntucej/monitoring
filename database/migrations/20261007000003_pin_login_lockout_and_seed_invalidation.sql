-- ============================================================================
-- Migration: 20261007000003_pin_login_lockout_and_seed_invalidation
-- Purpose: Issue #6: PIN login per-identifier lockout, account lockout,
--          seed PIN invalidation, and pin_must_change enforcement.
-- ============================================================================

-- 1. Add PIN lifecycle and lockout tracking columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pin_set_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS pin_set_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pin_must_change BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_locked_until
  ON users (locked_until)
  WHERE locked_until IS NOT NULL;

-- 2. Invalidate seeded default PINs (set by seed script with no pin_set_by)
UPDATE users
SET initial_pin_hash = NULL,
    pin_must_change = TRUE
WHERE pin_set_by IS NULL
  AND initial_pin_hash IS NOT NULL;

-- 3. Create per-identifier lockout table for PIN login attempts
CREATE TABLE IF NOT EXISTS pin_login_attempts (
  identifier TEXT PRIMARY KEY,
  failed_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pin_login_attempts_locked
  ON pin_login_attempts (locked_until)
  WHERE locked_until IS NOT NULL;

-- 4. Enable RLS on pin_login_attempts
ALTER TABLE pin_login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_pin_login_attempts"
  ON pin_login_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
