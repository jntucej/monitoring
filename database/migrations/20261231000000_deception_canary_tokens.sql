-- Migration: 20261231000000_deception_canary_tokens.sql
-- Control 7: Deception tripwires — honeytoken user row and canary audit entry

-- 1. Honeytoken DB user: role='sysadmin', status='ACTIVE', but login_identifier that no real flow uses.
-- Any login attempt or SELECT on this identifier fires a deception tripwire.
INSERT INTO public.users (
  id,
  unique_id,
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
  'canary-00000000-0000-0000-0000-000000000099',
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

-- 2. Canary audit entry (the sentinel src/lib/deception.ts watches for:
--    action='CANARY_TRIPWIRE_SENTINEL'). A NULL user_id + the immutable
--    audit log mean the integrity check passes as long as this exact row
--    is present and unmodified.
-- 2026-11-03: audit_logs_action_known is a closed-list CHECK constraint that
--    only admits known action values. 'CANARY_TRIPWIRE_SENTINEL' is not in
--    the list, so add it before inserting the canary row. The constraint is
--    rebuilt with the new value appended; if it does not exist, the insert
--    proceeds without the CHECK.
DO $$
DECLARE
  cdef   TEXT;
  extra  TEXT;
  newdef TEXT;
  lit    CONSTANT TEXT := '''';
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO cdef
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'audit_logs' AND c.conname = 'audit_logs_action_known'
    AND c.contype = 'c';
  IF cdef IS NOT NULL AND cdef NOT LIKE '%CANARY_TRIPWIRE_SENTINEL%' THEN
    -- Find the ARRAY[ anchor inside the constraint definition and insert
    -- the new value right after it (same approach as the 20261116 migration).
    SELECT string_agg(lit || v.val || lit, ', ') INTO extra
    FROM (VALUES ('CANARY_TRIPWIRE_SENTINEL')) v(val)
    WHERE position(lit || v.val || lit IN cdef) = 0;
    IF extra IS NOT NULL THEN
      newdef := replace(cdef, 'ARRAY[', 'ARRAY[' || extra || ',');
      EXECUTE 'ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_action_known';
      EXECUTE 'ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_known ' || newdef;
      RAISE NOTICE 'audit_logs_action_known: appended CANARY_TRIPWIRE_SENTINEL';
    END IF;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.audit_logs
                WHERE id = '00000000-0000-0000-0000-000000000099'::uuid) THEN
    INSERT INTO public.audit_logs (id, user_id, action, details, timestamp)
    VALUES (
      '00000000-0000-0000-0000-000000000099'::uuid,
      NULL,
      'CANARY_TRIPWIRE_SENTINEL',
      '{"tripwire":"audit_log_tamper_canary"}'::jsonb,
      NOW()
    );
  END IF;
END $$;
