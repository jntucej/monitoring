CREATE OR REPLACE FUNCTION public.can_user_authenticate(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status FROM users WHERE id = p_user_id;
  RETURN (v_status = 'ACTIVE');
END;
$$;
