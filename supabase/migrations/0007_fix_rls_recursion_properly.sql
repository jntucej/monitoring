-- Migration 0007: Fix RLS infinite recursion on users table
-- Drop policies first, then recreate functions with SECURITY DEFINER

DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update user data" ON users;
DROP POLICY IF EXISTS "Sysadmins can update user roles" ON users;
DROP POLICY IF EXISTS "Anyone can read user profiles" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_select_admin" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_update_admin" ON users;

DROP FUNCTION IF EXISTS public.is_admin(UUID);
DROP FUNCTION IF EXISTS public.is_sysadmin(UUID);

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM users W  SELECT role INTO user_role FROM users W  SELECT role INTO's  SELECT role INTO user_role FROM users W  SELECT role INTO user_ATE OR REPLACE FUNCTION public.is_sysadmin(user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE user_role TEXT;
BEGIN
  SELECT role INTO use  SELECT role INTO use  SELECT role INTO use  SELECT role INrole = 'sysadmin';
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END;
$$;

CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_select_admin" ON users FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "users_update_own" ON users FOR UPDATE UCREATE POLICY "users_upWITH CHECK (auth.uid() = id);
CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCR CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCd())) WITH CHECK (is_admin(auth.uid()));

GRANT EXECUTE ON FUNCTION public.is_GRANT EXECUTE ON FUNCTION public.is_GRANT EXECUTE ON FUNCTION public.is_sysGRANn(GRANT EXECUTE ON FUNCTicated;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
