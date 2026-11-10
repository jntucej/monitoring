BEGIN;

-- The legacy trigger reject_privileged_without_mfa() was patched in
-- 20270109000001 to read MFA enrollment from webauthn_credentials.
-- However, the live passkey routes (src/app/api/auth/passkeys/*) write
-- to user_passkeys, not webauthn_credentials. The MFA enforcement was
-- therefore silently off for all newly-registered passkeys.
--
-- This migration re-points the trigger to user_passkeys (the table the
-- app actually writes to). webauthn_credentials remains in place for
-- data-migration / export compatibility but is no longer the source of
-- truth for MFA state.

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
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role FROM public.users WHERE id = NEW.user_id;

  IF v_role NOT IN ('admin', 'sysadmin') THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT COALESCE(
      EXISTS (
        SELECT 1 FROM public.user_passkeys pk
         WHERE pk.user_id = NEW.user_id
      ),
      FALSE
    ) INTO v_mfa;
  EXCEPTION
    WHEN OTHERS THEN v_mfa := FALSE;
  END;

  IF v_mfa THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT count(*) INTO v_mfa_req
      FROM public.roles
     WHERE role = v_role;
  EXCEPTION
    WHEN OTHERS THEN v_mfa_req := 0;
  END;

  BEGIN
    SELECT COUNT(DISTINCT pk.user_id) INTO v_enrolled
      FROM public.user_passkeys pk
      JOIN public.users u ON u.id = pk.user_id
     WHERE u.role = 'sysadmin';
  EXCEPTION
    WHEN OTHERS THEN v_enrolled := 0;
  END;

  IF v_enrolled = 0 AND v_role = 'sysadmin' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'MFA required for privileged role session creation'
    USING ERRCODE = '42501';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.reject_privileged_without_mfa() FROM PUBLIC;

COMMIT;
