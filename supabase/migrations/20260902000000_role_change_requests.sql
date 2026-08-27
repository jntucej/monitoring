-- Migration for Role Promotion Requests Workflow
CREATE TABLE IF NOT EXISTS role_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  new_role TEXT NOT NULL CHECK (new_role IN ('operator','admin','sysadmin','warden','faculty','staff','student','parent')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  reason TEXT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_role_change_requests_status ON role_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_role_change_requests_target ON role_change_requests(target_user_id);
