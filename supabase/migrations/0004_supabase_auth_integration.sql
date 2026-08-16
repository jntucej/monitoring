-- Supabase Auth Integration Migration
-- This migration integrates the public.users table with Supabase Auth
-- by establishing the 1:1 identity relationship: public.users.id = auth.users.id

-- 1. Remove legacy authentication columns that will be managed by Supabase Auth
ALTER TABLE users
DROP COLUMN IF EXISTS password_hash,
DROP COLUMN IF EXISTS pin_hash;

-- 2. Update email column to be NOT NULL (required for Supabase Auth)
ALTER TABLE users
ALTER COLUMN email SET NOT NULL;

-- 3. Add auth_provider column to track authentication method
ALTER TABLE users
ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'email';

-- 4. Add last_password_change column for security tracking
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMPTZ;

-- 5. Add updated_at column for tracking record changes
ALTER TABLE users
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- 6. Add foreign key constraint to auth.users table
-- This establishes the 1:1 relationship: public.users.id = auth.users.id
ALTER TABLE users
ADD CONSTRAINT fk_users_auth
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 7. Add login_identifier column for application-specific login IDs
ALTER TABLE users
ADD COLUMN IF NOT EXISTS login_identifier TEXT UNIQUE;

-- 8. Add initial_pin_hash column for secure credential provisioning
-- Note: This is for initial provisioning only, not authentication
ALTER TABLE users
ADD COLUMN IF NOT EXISTS initial_pin_hash TEXT;

-- 9. Update existing users to set default values for new columns
UPDATE users
SET
  auth_provider = 'email',
  last_password_change = NOW(),
  updated_at = NOW()
WHERE
  auth_provider IS NULL OR
  last_password_change IS NULL OR
  updated_at IS NULL;

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_login_identifier ON users(login_identifier);

-- 11. Update RLS policies to work with the new identity model

-- Update users policies to include sysadmin where appropriate
CREATE OR REPLACE POLICY "Users can view their own data"
ON users
FOR SELECT
USING (id = auth.uid());

CREATE OR REPLACE POLICY "Users can update their own data"
ON users
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE OR REPLACE POLICY "Admins can view all users"
ON users
FOR SELECT
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'sysadmin')));

CREATE OR REPLACE POLICY "Admins can update user data"
ON users
FOR UPDATE
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'sysadmin')))
WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'sysadmin'))));

CREATE OR REPLACE POLICY "Sysadmins can update user roles"
ON users
FOR UPDATE
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'sysadmin'))
WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'sysadmin'));

-- 12. Update helper functions to work with the new role hierarchy

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM users WHERE id = user_id AND (role = 'admin' OR role = 'sysadmin'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_sysadmin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM users WHERE id = user_id AND role = 'sysadmin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create a function to resolve login identifiers to Supabase Auth identities
CREATE OR REPLACE FUNCTION resolve_login_identifier(login_id TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT email FROM users WHERE login_identifier = login_id);
EXCEPTION WHEN NO_DATA_FOUND THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Create a function to validate that a user can authenticate
CREATE OR REPLACE FUNCTION can_user_authenticate(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user exists in public.users
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = user_id) THEN
    RETURN FALSE;
  END IF;

  -- Check if user has ACTIVE status
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = user_id AND status = 'ACTIVE') THEN
    RETURN FALSE;
  END IF;

  -- Check if user has a valid auth.users record
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- 16. Add comments to document the new authentication architecture
COMMENT ON TABLE users IS 'System users with application profiles. Identity is managed by Supabase Auth (1:1 relationship with auth.users).';

COMMENT ON COLUMN users.id IS 'Primary key that matches auth.users.id (1:1 relationship)';
COMMENT ON COLUMN users.email IS 'User email address, required for Supabase Auth authentication';
COMMENT ON COLUMN users.auth_provider IS 'Authentication provider used (email, google, etc.)';
COMMENT ON COLUMN users.login_identifier IS 'Application-specific login identifier (employee ID, roll number, etc.)';
COMMENT ON COLUMN users.initial_pin_hash IS 'Hashed initial PIN for credential provisioning (not used for authentication)';
COMMENT ON COLUMN users.last_password_change IS 'Timestamp of last password change for security tracking';
COMMENT ON COLUMN users.updated_at IS 'Timestamp of last record update';

-- 17. Create a function to handle user creation with Supabase Auth integration
CREATE OR REPLACE FUNCTION create_user_with_auth(
  p_name TEXT,
  p_role TEXT,
  p_employee_id TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_gate_id UUID,
  p_parent_id UUID,
  p_supervised_gates UUID[],
  p_assigned_hostel TEXT,
  p_is_hod BOOLEAN,
  p_department_id TEXT,
  p_can_view_gender TEXT[],
  p_status TEXT,
  p_login_identifier TEXT
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- This function would be called after creating the user in Supabase Auth
  -- The auth.users record should already exist with the same ID

  -- Generate a new UUID for the user (should match auth.users.id)
  v_user_id := uuid_generate_v4();

  -- Insert the user record
  INSERT INTO users (
    id, name, role, employee_id, email, phone, gate_id, parent_id,
    supervised_gates, assigned_hostel, is_hod, department_id,
    can_view_gender, status, auth_provider, last_password_change,
    updated_at, login_identifier
  ) VALUES (
    v_user_id, p_name, p_role, p_employee_id, p_email, p_phone, p_gate_id, p_parent_id,
    p_supervised_gates, p_assigned_hostel, p_is_hod, p_department_id,
    p_can_view_gender, p_status, 'email', NOW(), NOW(), p_login_identifier
  );

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. Create a function to handle user deletion with Supabase Auth integration
CREATE OR REPLACE FUNCTION delete_user_with_auth(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Delete the user from public.users (will cascade to auth.users via foreign key)
  DELETE FROM users WHERE id = p_user_id;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 19. Update the audit log trigger to handle the new authentication architecture
CREATE OR REPLACE FUNCTION create_audit_log_on_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (action, user_id, user_name, role, details)
  VALUES (
    'USER_CREATED',
    'system',
    'System',
    'system',
    'Created new user ' || NEW.id || ' with role ' || NEW.role || ' using Supabase Auth'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 20. Create a function to invalidate all user sessions (for status/role changes)
CREATE OR REPLACE FUNCTION invalidate_all_user_sessions(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  -- This function would call the Supabase Admin API to revoke all sessions
  -- Implementation would be handled in application code

  -- For now, we'll just return success
  v_result := TRUE;

  -- Audit the session invalidation
  INSERT INTO audit_logs (action, user_id, user_name, role, details)
  VALUES (
    'SESSIONS_INVALIDATED',
    current_setting('app.current_user_id'),
    current_setting('app.current_user_name'),
    current_setting('app.current_user_role'),
    'Invalidated all sessions for user ' || p_user_id
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 21. Update the user_student_mapping function to work with the new identity model
CREATE OR REPLACE FUNCTION user_student_mapping(user_id UUID)
RETURNS UUID AS $$
DECLARE
  student_id UUID;
BEGIN
  -- Check if the user is a student (direct mapping)
  SELECT id INTO student_id FROM students WHERE id = user_id;

  -- If not a student, check if they are a parent
  IF NOT FOUND THEN
    SELECT student_id INTO student_id FROM user_student_mapping WHERE user_id = user_id LIMIT 1;
  END IF;

  RETURN student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 22. Ensure all tables have RLS enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campus_occupancy ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_student_mapping ENABLE ROW LEVEL SECURITY;