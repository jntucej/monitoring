-- Migration: 20260829000000_invalidate_all_user_sessions.sql
-- Description: RPC function to clear user active session handles

CREATE OR REPLACE FUNCTION invalidate_all_user_sessions(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.users 
  SET handle = NULL, updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;
