-- database/migrations/20261230000010_fix_resolve_login_identifier.sql
BEGIN;

CREATE OR REPLACE FUNCTION public.resolve_login_identifier(p_login_id TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM public.users
   WHERE deleted_at IS NULL
     AND (LOWER(login_identifier) = LOWER(p_login_id)
       OR LOWER(email) = LOWER(p_login_id)
       OR LOWER(unique_id) = LOWER(p_login_id)
       OR LOWER(handle) = LOWER(p_login_id))
   LIMIT 1;
  RETURN v_email;
END; $$;

CREATE OR REPLACE FUNCTION public.can_user_authenticate(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND status = 'ACTIVE' AND deleted_at IS NULL); $$;

CREATE OR REPLACE FUNCTION public.mirror_pin_attempt_to_login()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  INSERT INTO public.login_attempts (identifier, failed_count, locked_until, last_attempt_at, last_channel)
  VALUES (UPPER(NEW.identifier), NEW.failed_count, NEW.locked_until,
          COALESCE(NEW.last_attempt_at, NOW()), 'pin')
  ON CONFLICT (identifier) DO UPDATE
    SET failed_count = GREATEST(login_attempts.failed_count, EXCLUDED.failed_count),
        locked_until = GREATEST(COALESCE(login_attempts.locked_until,'-infinity'::timestamptz),
                                COALESCE(EXCLUDED.locked_until,'-infinity'::timestamptz)),
        last_attempt_at = GREATEST(login_attempts.last_attempt_at, EXCLUDED.last_attempt_at),
        last_channel = 'pin';
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.enforce_permission_transitions()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_allowed text[];
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  CASE OLD.status
    WHEN 'PENDING'   THEN v_allowed := ARRAY['APPROVED','REJECTED','ESCALATED','COMPLETED','CANCELLED','EXPIRED','DISPUTED'];
    WHEN 'ESCALATED' THEN v_allowed := ARRAY['APPROVED','REJECTED','COMPLETED','CANCELLED','EXPIRED','DISPUTED'];
    WHEN 'APPROVED'  THEN v_allowed := ARRAY['COMPLETED','CANCELLED','EXPIRED','DISPUTED'];
    WHEN 'DISPUTED'  THEN v_allowed := ARRAY['APPROVED','REJECTED','COMPLETED','CANCELLED'];
    ELSE v_allowed := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW.status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %', OLD.status, NEW.status USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
