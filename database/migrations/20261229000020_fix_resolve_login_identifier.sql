-- database/migrations/20261229000020_fix_resolve_login_identifier.sql
BEGIN;

CREATE OR REPLACE FUNCTION public.resolve_login_identifier(p_login_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email
    FROM public.users
   WHERE deleted_at IS NULL
     AND (
          LOWER(login_identifier) = LOWER(p_login_id)
       OR LOWER(email)            = LOWER(p_login_id)
       OR LOWER(unique_id)        = LOWER(p_login_id)
       OR LOWER(handle)           = LOWER(p_login_id)
     )
   LIMIT 1;
  RETURN v_email;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_user_authenticate(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
     WHERE id = p_user_id
       AND status = 'ACTIVE'
       AND deleted_at IS NULL
  );
$$;

COMMIT;
