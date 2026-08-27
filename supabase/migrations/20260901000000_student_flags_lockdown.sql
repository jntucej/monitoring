-- ============================================================================
-- Student flag_status column + lockdown_broadcasts table
-- ============================================================================

-- 1. Lightweight "suspicious" flag on users (does NOT lock auth; purely advisory)
ALTER TABLE users ADD COLUMN IF NOT EXISTS flag_status TEXT
  CHECK (flag_status IN ('suspicious','restricted'))
  DEFAULT NULL;

-- 2. Lockdown broadcasts (admin triggers; operators poll)
CREATE TABLE IF NOT EXISTS lockdown_broadcasts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scopes      TEXT[] NOT NULL,          -- e.g. ['students','faculty'] or ['all']
  message     TEXT,
  issued_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  issued_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lifted_at   TIMESTAMPTZ,              -- NULL = still active
  lifted_by   UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Only admins can read/write lockdowns; operators can read active ones
ALTER TABLE lockdown_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY lockdown_read_admin ON lockdown_broadcasts
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY lockdown_read_operator ON lockdown_broadcasts
  FOR SELECT TO authenticated
  USING (is_operator(auth.uid()) AND lifted_at IS NULL);

CREATE POLICY lockdown_write_admin ON lockdown_broadcasts
  FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Service role bypass (used by API routes via service client)
CREATE POLICY lockdown_all_service ON lockdown_broadcasts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Index for fast "is there an active lockdown?" queries
CREATE INDEX IF NOT EXISTS idx_lockdown_active ON lockdown_broadcasts(lifted_at)
  WHERE lifted_at IS NULL;

COMMENT ON TABLE lockdown_broadcasts IS
  'Admin-issued campus lockdown events; operators poll lifted_at IS NULL for active state';
COMMENT ON COLUMN users.flag_status IS
  'Admin advisory flag: suspicious=yellow alert, restricted=block entry at gate';
