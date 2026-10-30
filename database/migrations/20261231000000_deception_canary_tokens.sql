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
  roles,
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
  ARRAY['sysadmin']::varchar[],
  'ACTIVE',
  '$2a$12$e8xL8wB83yYwAUpu1zVf2.Wc00000000000000000000000000000',
  1,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Canary audit entry: unique entry_hash that no real action produces.
-- Any tampering, deletion, or modification of the audit log chain triggers an immediate alarm.
INSERT INTO public.audit_logs (
  id,
  user_id,
  action,
  entity,
  entity_id,
  details,
  entry_hash,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000099',
  'CANARY_TRIPWIRE_SENTINEL',
  'system_integrity',
  'deception_canary_tripwire',
  '{"tripwire": "audit_log_tamper_canary", "policy": "Zero-tolerance deception tripwire"}'::jsonb,
  'canary-audit-tripwire-hash-deadbeef0001',
  NOW()
)
ON CONFLICT (id) DO NOTHING;
