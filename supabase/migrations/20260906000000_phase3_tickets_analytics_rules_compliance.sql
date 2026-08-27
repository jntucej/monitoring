-- Phase 3 Migration (Part 2): Support Tickets, Analytics Saved Reports, Gate Rules, Compliance

-- 3. Support Tickets Tables
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'system_issue',
  priority TEXT NOT NULL DEFAULT 'medium',
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to TEXT,
  assigned_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_ticket_comments (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  comment TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial support ticket for demo
INSERT INTO support_tickets (id, ticket_number, user_id, user_name, user_role, category, priority, subject, description, status)
VALUES
  ('tck-demo-1', 'TCK-1001', 'system', 'Demo Operator', 'operator', 'gate_access', 'high', 'North Gate scanner delay', 'Scanner response latency elevated during peak morning hours.', 'open')
ON CONFLICT (id) DO NOTHING;

-- 4. Saved Report Definitions Table
CREATE TABLE IF NOT EXISTS saved_report_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  query_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  schedule_cron TEXT,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Gate Access Scheduling & Rules Table
CREATE TABLE IF NOT EXISTS gate_access_rules (
  id TEXT PRIMARY KEY,
  gate_id TEXT NOT NULL DEFAULT 'ALL',
  rule_name TEXT NOT NULL,
  days_of_week JSONB NOT NULL DEFAULT '[0,1,2,3,4,5,6]'::jsonb,
  start_time TEXT NOT NULL DEFAULT '06:00',
  end_time TEXT NOT NULL DEFAULT '22:00',
  action TEXT NOT NULL DEFAULT 'allow',
  priority INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  override_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gate_holidays (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  name TEXT NOT NULL,
  gate_id TEXT NOT NULL DEFAULT 'ALL',
  restricted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default gate rules
INSERT INTO gate_access_rules (id, gate_id, rule_name, days_of_week, start_time, end_time, action, priority)
VALUES
  ('rule-default-main', 'ALL', 'Standard Campus Operating Hours', '[1,2,3,4,5,6]'::jsonb, '06:00', '22:00', 'allow', 1),
  ('rule-night-curfew', 'ALL', 'Night Curfew Restricted Access', '[0,1,2,3,4,5,6]'::jsonb, '22:01', '05:59', 'restrict', 2)
ON CONFLICT (id) DO NOTHING;

-- 6. Compliance & Retention Policies Table
CREATE TABLE IF NOT EXISTS retention_policies (
  id TEXT PRIMARY KEY,
  data_category TEXT UNIQUE NOT NULL,
  retention_days INT NOT NULL DEFAULT 365,
  auto_delete BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_compliance_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  target_user_id TEXT,
  details TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed retention policies
INSERT INTO retention_policies (id, data_category, retention_days, auto_delete)
VALUES
  ('ret-movement-logs', 'movement_logs', 365, true),
  ('ret-expired-passes', 'expired_passes', 180, true),
  ('ret-audit-logs', 'audit_logs', 730, true),
  ('ret-support-tickets', 'support_tickets', 365, true),
  ('ret-notifications', 'notifications', 90, true)
ON CONFLICT (id) DO NOTHING;
