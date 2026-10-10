CREATE INDEX IF NOT EXISTS idx_audit_user_timestamp
  ON audit_logs (user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_action_timestamp
  ON audit_logs (action, timestamp DESC);
