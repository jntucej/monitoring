-- Update user soft delete function
CREATE OR REPLACE FUNCTION delete_user_with_auth(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE v_caller_role TEXT; BEGIN
  SELECT role INTO v_caller_role FROM users WHERE id = current_setting('app.current_user_id', true)::uuid;
  IF v_caller_role IS NULL OR v_caller_role != 'sysadmin' THEN
    RAISE EXCEPTION 'FORBIDDEN: Only system administrators can delete users (soft delete)';
  END IF;
  IF p_user_id = current_setting('app.current_user_id', true)::uuid THEN RAISE EXCEPTION 'FORBIDDEN: Cannot delete own account'; END IF;
  UPDATE users SET deleted_at = NOW() WHERE id = p_user_id;
  RETURN FOUND;
EXCEPTION WHEN OTHERS THEN RETURN FALSE; END; $$;
