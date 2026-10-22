-- database/migrations/20261216000000_remove_mfa_subsystem.sql
--
-- Removes the MFA / 2FA subsystem from the database.
--
--   1. Drops the BEFORE INSERT trigger on sessions that rejected
--      privileged (admin/sysadmin) session creation when MFA was
--      required but the user had not enrolled.
--   2. Drops the trigger function.
--   3. Drops the mfa_login_challenges table and its indexes.
--   4. Drops the two_factor_* columns on users.
--
-- The application code that read these objects has already been
-- removed in the same deploy (src/lib/totp.ts, src/lib/mfa-secret.ts,
-- src/lib/mfa-enroll.ts, the 2fa/* route trees, and the MFA branch
-- in /api/auth/login and /api/auth/sso). Applying this migration
-- before that code ships would leave live queries hitting dropped
-- columns; the two land together.
--
-- Idempotent: every DROP uses IF EXISTS, so re-running is safe.

BEGIN;

-- 1 + 2. Session-insert MFA guard trigger + function.
DROP TRIGGER IF EXISTS trg_reject_privileged_mfa ON public.sessions;
DROP FUNCTION IF EXISTS public.reject_privileged_without_mfa();

-- 3. MFA challenge table (indexes drop with it).
DROP TABLE IF EXISTS public.mfa_login_challenges CASCADE;

-- 4. MFA columns on users.
ALTER TABLE public.users
  DROP COLUMN IF EXISTS two_factor_enabled,
  DROP COLUMN IF EXISTS two_factor_secret,
  DROP COLUMN IF EXISTS two_factor_enrolled_at,
  DROP COLUMN IF EXISTS two_factor_recovery_codes;

COMMIT;
