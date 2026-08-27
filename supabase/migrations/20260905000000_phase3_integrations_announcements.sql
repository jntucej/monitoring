-- Phase 3 Migration (Part 1): Integrations Hub & System Announcements

-- 1. Integrations Hub Tables
CREATE TABLE IF NOT EXISTS integration_configs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'connected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integration_logs (
  id TEXT PRIMARY KEY,
  integration_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  records_synced INT NOT NULL DEFAULT 0,
  error TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Initial Integrations if missing
INSERT INTO integration_configs (id, type, name, enabled, config, status)
VALUES
  ('int-hr', 'hr_sync', 'HR System Sync (Workday/SAP)', true, '{"endpoint": "https://hr.college.edu/api/sync", "sync_interval_hours": 6}'::jsonb, 'connected'),
  ('int-sis', 'sis_sync', 'SIS Student Portal Sync', true, '{"endpoint": "https://sis.college.edu/api/v1/students", "auto_import": true}'::jsonb, 'connected'),
  ('int-email', 'email', 'SMTP / SendGrid Gateway', true, '{"provider": "sendgrid", "from_email": "notifications@gate.college.edu"}'::jsonb, 'connected'),
  ('int-sms', 'sms', 'Twilio / SMS Gateway', true, '{"provider": "twilio", "sender_id": "GATEMN"}'::jsonb, 'connected'),
  ('int-bio', 'attendance', 'Biometric Turnstile Controller', true, '{"mode": "realtime", "turnstiles": 4}'::jsonb, 'connected')
ON CONFLICT (id) DO NOTHING;

-- 2. System Announcements Tables
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  audience TEXT NOT NULL DEFAULT 'all',
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_announcement_dismissals (
  id TEXT PRIMARY KEY,
  announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

-- Seed initial announcement
INSERT INTO announcements (id, title, message, priority, audience, is_published, created_by)
VALUES
  ('anc-welcome', 'Gate Monitor v2.5 Online', 'System upgrades complete. 2FA TOTP and active session controls are now live.', 'medium', 'all', true, 'sysadmin')
ON CONFLICT (id) DO NOTHING;
