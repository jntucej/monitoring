-- Migration: 20260910000000_alert_rules_and_settings.sql
-- Description: Create alert_rules, system_settings, and sso_config tables for persistent operational configurations.

CREATE TABLE IF NOT EXISTS alert_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  metric TEXT NOT NULL,
  threshold DOUBLE PRECISION NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 5,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('critical', 'warning', 'info', 'low', 'medium', 'high')),
  channel TEXT NOT NULL DEFAULT 'opsgenie',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default alert rules
INSERT INTO alert_rules (id, name, metric, threshold, duration_minutes, severity, channel, enabled) VALUES
  ('rule-1', 'High API Error Rate', 'http_requests_failed_pct', 5, 5, 'critical', 'opsgenie', true),
  ('rule-2', 'High DB Response Latency', 'db_query_duration_ms', 500, 3, 'warning', 'pagerduty', true),
  ('rule-3', 'Gate Controller Disconnection', 'gate_heartbeat_offline_mins', 10, 10, 'critical', 'webhook', true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_settings (id, value) VALUES
  ('security_ip_allowlist', '{"allowed_ips": ["127.0.0.1", "::1", "192.168.1.0/24"], "forced_2fa": false}'::jsonb)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS sso_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  provider_id TEXT NOT NULL DEFAULT 'google',
  enabled BOOLEAN NOT NULL DEFAULT true,
  client_id TEXT NOT NULL,
  issuer_url TEXT NOT NULL,
  group_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO sso_config (id, provider_id, enabled, client_id, issuer_url, group_mappings) VALUES
  ('default', 'google', true, 'gate-monitor-client-id.apps.googleusercontent.com', 'https://accounts.google.com', '{"Campus-Security-Leads": "admin", "IT-Administrators": "sysadmin", "Faculty-Members": "faculty"}'::jsonb)
ON CONFLICT (id) DO NOTHING;
