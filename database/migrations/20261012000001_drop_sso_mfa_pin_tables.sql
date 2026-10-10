-- Migration to drop redundant/unreferenced security tables
-- WARNING: This will break SSO, MFA, and PIN-based login functionality.
-- Run this only if these features are fully decommissioned.

BEGIN;

-- 1. Drop SSO Tables
DROP TABLE IF EXISTS public.sso_config CASCADE;
DROP TABLE IF EXISTS public.sso_authorization_states CASCADE;

-- 2. Drop 2FA/MFA Tables
DROP TABLE IF EXISTS public.mfa_login_challenges CASCADE;
-- Note: 'webauthn_credentials' and 'mobile_enrollment_codes' were asked to remain for now
-- so we only drop the specific tables requested (MFA/2FA login challenge table).

-- 3. Drop Login Lockout Table (renamed to login_attempts in commit 08a9cbf...)
DROP TABLE IF EXISTS public.login_attempts CASCADE;
DROP TABLE IF EXISTS public.pin_login_attempts CASCADE; -- Drop both just in case

COMMIT;
