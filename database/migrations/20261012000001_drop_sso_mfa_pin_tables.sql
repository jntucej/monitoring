-- Migration 20261012000001: Preserved active SSO, MFA, and PIN login tables
-- Tables (sso_config, sso_authorization_states, mfa_login_challenges, login_attempts, pin_login_attempts)
-- remain active for application authentication and lockout enforcement.

BEGIN;
-- No-op: do not drop active security tables.
SELECT 1;
COMMIT;
