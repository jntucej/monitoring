-- Migration 0006: Fix Infinite Recursion in RLS Policies for Relation 'users'
-- Direct queries to table 'users' inside policies on table 'users' cause Postgres error 42P17 (infinite recursion).
-- Using SECURITY DEFINER helper functions bypasses RLS within the policy check safely.

-- 1. Ensure helper functions exist with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM users WHERE id = user_id AND (role = 'admin' OR role = 'sysadmin'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_sysadmin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM users WHERE id = user_id AND role = 'sysadmin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Re-create users RLS policies using SECURITY DEFINER functions to prevent infinite recursion
DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users"
ON users
FOR SELECT
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update user data" ON users;
CREATE POLICY "Admins can update user data"
ON users
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Sysadmins can update user roles" ON users;
CREATE POLICY "Sysadmins can update user roles"
ON users
FOR UPDATE
USING (is_sysadmin(auth.uid()))
WITH CHECK (is_sysadmin(auth.uid()));
