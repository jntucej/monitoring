-- database/migrations/20261201000001_fix_mfa_privileged_trigger.sql
--
-- Fix the chicken-and-egg created by 20261020000000:
--   That migration installed trg_reject_privileged_mfa, which RAISEs for any
--   admin/sysadmin session insert where two_factor_enabled is false. But:
--     * two_factor_enabled defaults to false on a fresh DB,
--     * the app's own policy (isMfaRequiredForPrivileged) treats MFA as
--       opt-in (default false), and
--     * there is no seed that flips it true for the first sysadmin.
--   Net effect: the first sysadmin can never create a session to enrol in
--   2FA, and every privileged login 500s even when MFA was never required.
--
-- This migration REPLACES the trigger function so it only blocks when MFA is
-- actually required, read from the SAME source the app reads
-- (system_config, key 'global_settings', data->>'mfaRequiredForAdmin').
-- A first-privileged-user escape hatch remains: when no sysadmin exists yet
-- that has two_factor_enabled, the very first session insert for that
-- sysadmin is allowed so they can boot up and enrol.
--
-- Idempotent: safe to re-run; only rewrites the function + trigger.

BEGIN;

CREATE OR REPLACE FUNCTION public.reject_privileged_without_mfa()
RETURNS TRIGGER AS $$
DECLARE
  v_role    TEXT;
  v_mfa     BOOLEAN;
  v_mfa_req BOOLEAN;
  v_enrolled INT;
BEGIN
  -- Only relevant for session rows that carry a user.
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role, COALESCE(two_factor_enabled, false)
    INTO v_role, v_mfa
    FROM public.users
   WHERE id = NEW.user_id;

  -- Non-privileged users are unaffected.
  IF v_role NOT IN ('admin', 'sysadmin') THEN
    RETURN NEW;
  END IF;

  -- Already enrolled? Nothing to enforce.
  IF v_mfa THEN
    RETURN NEW;
  END IF;

  -- Is MFA actually required? Read the same source the app uses.
  -- system_config is a VIEW over system_settings: (id AS key, value, data).
  -- Fail OPEN (required=false) only if we genuinely cannot read config,
  -- but the escape hatch below still applies on a fresh DB.
  BEGIN
    SELECT COALESCE(
             ((data->>'mfaRequiredForAdmin')::text = 'true'),
             ((data->>'mfa_required_for_admin')::text = 'true')
           ) INTO v_mfa_req
      FROM public.system_config
     WHERE key = 'global_settings'
     LIMIT 1;
    IF NOT FOUND THEN
      v_mfa_req := false;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- config unreadable: do not hard-block; rely on the app layer which
      -- fails closed for the actual token check.
      v_mfa_req := false;
  END;

  IF NOT v_mfa_req THEN
    RETURN NEW;
  END IF;

  -- MFA is required but this user has not enrolled. Escape hatch: allow the
  -- very first session for the FIRST sysadmin who still has no enrolled MFA,
  -- so they can log in once to complete 2FA setup (matches /api/auth/mfa/
  -- bootstrap, which mints a 10-minute single-purpose enroll token for
  -- exactly this case).
  BEGIN
    SELECT COUNT(*) INTO v_enrolled
      FROM public.users
     WHERE role = 'sysadmin' AND COALESCE(two_factor_enabled, false);
  EXCEPTION
    WHEN OTHERS THEN v_enrolled := 0;
  END;

  IF v_enrolled = 0 AND v_role = 'sysadmin' THEN
    -- first-time enrollment path: allow exactly one session, then the user
    -- must enroll before subsequent sessions.
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'MFA required for privileged role session creation'
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'sessions'
  ) THEN
    DROP TRIGGER IF EXISTS trg_reject_privileged_mfa ON public.sessions;
    CREATE TRIGGER trg_reject_privileged_mfa
      BEFORE INSERT ON public.sessions
      FOR EACH ROW
      EXECUTE FUNCTION public.reject_privileged_without_mfa();
  END IF;
END $$;

COMMIT;
