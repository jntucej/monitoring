-- NOTE: DELIBERATE NO-OP. The SSO/MFA/PIN table drops actually happened in
-- 20261216000000_remove_mfa_subsystem.sql; pin_login_attempts + login_attempts
-- are still live and required.
--
-- Migration 20261012000001: Preserved active SSO, MFA, and PIN login tables
-- Tables (sso_config, sso_authorization_states, mfa_login_challenges, login_attempts, pin_login_attempts)
-- remain active for application authentication and lockout enforcement.

BEGIN;
-- No-op: do not drop active security tables.
SELECT 1;
COMMIT;
