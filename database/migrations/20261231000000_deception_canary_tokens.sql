-- Migration: 20261231000000_deception_canary_tokens.sql
-- Control 7: Deception tripwires — honeytoken user row and canary audit entry

-- 1. Honeytoken DB user: role='sysadmin', status='ACTIVE', but login_identifier that no real flow uses.
-- Any login attempt or SELECT on this identifier fires a deception tripwire.
INSERT INTO public.users (
  id,
  name,
  email,
  login_identifier,
  role,
  status,
  password_hash,
  session_version,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000099',
  'System Administration Root (Canary)',
  'sysadmin.canary@internal.monitoring.local',
  'sysadmin.canary',
  'sysadmin',
  'ACTIVE',
  '$2a$12$e8xL8wB83yYwAUpu1zVf2.Wc00000000000000000000000000000',
  1,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Canary audit entry
INSERT INTO public.audit_logs (
  id,
  user_id,
  action,
  details,
  timestamp
) VALUES (
  '00000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000099',
  'CANARY_ALERT_TRIGGERED',
  '{"tripwire":"audit_log_tamper_canary"}'::jsonb,
  NOW()
)
ON CONFLICT (id) DO NOTHING;
