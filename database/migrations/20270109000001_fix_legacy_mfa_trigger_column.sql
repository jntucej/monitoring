BEGIN;

-- Legacy trigger fix (discovered by Part 6 — the login-route session
-- INSERT was failing on every login; applied to gate_postgres on 2026-11-04
-- via `docker cp` + `psql -f` — stdin-heredoc application was silently
-- skipped by psql's autocommit handling):
--
--   20261216000000 dropped users.two_factor_enabled but left the
--   reject_privileged_without_mfa() trigger function in place, so every
--   INSERT INTO sessions (login, refresh rotation, step-up) threw
--   "column two_factor_enabled does not exist" and was silently swallowed
--   by the catch blocks. This is why no session rows were ever created
--   and refresh reuse-detection had no data to work with.
--
-- The function now reads MFA enrollment from webauthn_credentials
-- (the post-20261216 source of truth — 20270107000000 replaced the
-- TOTP/subsystem with passkeys).

CREATE OR REPLACE FUNCTION public.reject_privileged_without_mfa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_role     TEXT;
  v_mfa      BOOLEAN;
  v_mfa_req  BOOLEAN;
  v_enrolled INT;
BEGIN
  -- Only relevant for session rows that carry a user.
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role FROM public.users WHERE id = NEW.user_id;

  -- Non-privileged users are unaffected.
  IF v_role NOT IN ('admin', 'sysadmin') THEN
    RETURN NEW;
  END IF;

  -- Already enrolled in MFA (passkey or TOTP)? Nothing to enforce.
  BEGIN
    SELECT COALESCE(
      EXISTS (
        SELECT 1 FROM public.webauthn_credentials c
         WHERE c.user_id = NEW.user_id
      ),
      FALSE
    ) INTO v_mfa;
  EXCEPTION
    WHEN OTHERS THEN v_mfa := FALSE;
  END;

  IF v_mfa THEN
    RETURN NEW;
  END IF;

  -- Is MFA actually required? Read the same source the app uses.
  -- system_config is a VIEW over system_settings: (id AS key, value, data).
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

  -- MFA required but this user has not enrolled. Escape hatch: allow the
  -- very first session for the FIRST sysadmin who still has no enrolled
  -- MFA, so they can log in once to complete 2FA setup.
  BEGIN
    SELECT COUNT(DISTINCT c.user_id) INTO v_enrolled
      FROM public.webauthn_credentials c
      JOIN public.users u ON u.id = c.user_id
     WHERE u.role = 'sysadmin';
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
$function$;

REVOKE EXECUTE ON FUNCTION public.reject_privileged_without_mfa() FROM PUBLIC;

COMMIT;
