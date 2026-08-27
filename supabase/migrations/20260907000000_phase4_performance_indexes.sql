-- Phase 4 Migration: Composite Indexes for Scalability & Fast Query Performance

CREATE INDEX IF NOT EXISTS idx_movement_logs_composite 
ON movement_logs(timestamp DESC, gate_id, direction);

CREATE INDEX IF NOT EXISTS idx_gate_passes_composite 
ON gate_passes(user_id, final_status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_composite 
ON audit_logs(timestamp DESC, user_id, action);

CREATE INDEX IF NOT EXISTS idx_users_onboarding 
ON users(id, role, account_status);
