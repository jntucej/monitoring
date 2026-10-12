-- 20261112000002_gate_operator_kiosk_default.sql
-- Gate operator kiosk default session support.
--
--   1. Add users.is_kiosk_default BOOLEAN NOT NULL DEFAULT FALSE
--   2. Ensure the built-in 'OPERATOR' account (unique_id='OPERATOR') has
--      a working login_identifier and gate assignment so the kiosk can
--      sign in without manual credential entry.
--      - login_identifier: set to 'OPERATOR' if still NULL
--      - gate_id: set to the Main Campus Gate (gate_code='MAIN') if still NULL
--      - initial_pin_hash: set to a bcrypt hash of '1234' if still NULL
--        (default kiosk PIN; sysadmin should change it via the users API)
--      - is_kiosk_default: set to TRUE for this account
--   3. Flag the 'OPERATOR' user as the kiosk default (is_kiosk_default = TRUE)
--      so the /api/operator/kiosk-session endpoint can locate it.
--
-- Idempotent: every UPDATE is guarded by a WHERE clause so it only fires
-- when the target column is still NULL (or FALSE for the flag).
-- Re-running this migration is safe.
--
-- Note: The gate_id FK references gates(id) with ON DELETE SET NULL.
-- The Main Campus Gate seed (gate_code='MAIN') is in schema.sql and
-- is present before this migration runs in the standard pipeline.

BEGIN;

-- 1. New column on users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_kiosk_default BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.users.is_kiosk_default IS
  'TRUE for the one operator account designated as the gate-kiosk default '
  'session identity. The /api/operator/kiosk-session endpoint mints a short-lived '
  'JWT for this user (rate-limited, audit-logged). Only one user may hold this '
  'flag at a time (enforced by the application layer, not the DB).';

-- 2. Ensure the built-in OPERATOR account has the fields the kiosk needs
-- 2a. login_identifier: PIN-login matches on this column; keep it in sync
UPDATE public.users
   SET login_identifier = 'OPERATOR'
 WHERE unique_id = 'OPERATOR'
   AND role = 'operator'
   AND (login_identifier IS NULL OR login_identifier = '');

-- 2b. gate_id: bind to the Main Campus Gate so the kiosk opens a real gate
UPDATE public.users u
   SET gate_id = g.id
  FROM public.gates g
 WHERE u.unique_id = 'OPERATOR'
   AND u.role = 'operator'
   AND u.gate_id IS NULL
   AND g.gate_code = 'MAIN'
   AND g.is_active = TRUE;

-- 2c. initial_pin_hash: a working default PIN so PIN-login can authenticate
--     the kiosk operator without any pre-existing hash.
--     bcrypt cost 10 of '1234' — the same cost used by hashPin() in the app.
-- Default kiosk PIN is '1234'. This is a known shared default for the kiosk
-- (the same value seed-all.sql uses as the master PIN for non-sysadmin roles,
-- hashed differently). Sysadmin MUST rotate it via PATCH /api/users/:id
-- (body { pin: '...' }) after first use.
UPDATE public.users
   SET initial_pin_hash = '$2b$10$Z7l/ZN3k5xsOma77gO9mmeKCk3IlE2/9PI54eRy/SkzykUqGvB0rq'
 WHERE unique_id = 'OPERATOR'
   AND role = 'operator'
   AND initial_pin_hash IS NULL;

-- 3. Designate this account as the kiosk default
UPDATE public.users
   SET is_kiosk_default = TRUE
 WHERE unique_id = 'OPERATOR'
   AND role = 'operator';

-- Record migration
INSERT INTO public.schema_migrations (version)
VALUES ('20261112000002')
ON CONFLICT (version) DO NOTHING;

COMMIT;
