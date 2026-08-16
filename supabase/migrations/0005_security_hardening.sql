-- Security Hardening Migration
-- Fixes identified by SECURITY_VERIFICATION_REPORT.md
-- Date: 2026-08-16

-- =========================================================================
-- 1. SECURE SECURITY DEFINER FUNCTIONS
-- =========================================================================

DROP FUNCTION IF EXISTS create_user_with_auth(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID[], TEXT, BOOLEAN, TEXT, TEXT[], TEXT, TEXT);
DROP FUNCTION IF EXISTS create_user_with_auth(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT[], TEXT, BOOLEAN, TEXT, TEXT[], TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_user_with_auth(
  p_name TEXT,
  p_role TEXT,
  p_employee_id TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_gate_id UUID,
  p_parent_id UUID,
  p_supervised_gates TEXT[],
  p_assigned_hostel TEXT,
  p_is_hod BOOLEAN,
  p_department_id TEXT,
  p_can_view_gender TEXT[],
  p_status TEXT,
  p_login_identifier TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_caller_role TEXT;
BEGIN
  -- Authorization: Only system admins can create users
  SELECT role INTO v_caller_role FROM users WHERE id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role != 'sysadmin' THEN
    RAISE EXCEPTION 'FORBIDDEN: Only system administrators can create users';
  END IF;

  -- Validate role value
  IF p_role NOT IN ('admin', 'sysadmin', 'supervisor', 'operator', 'student', 'parent') THEN
    RAISE EXCEPTION 'INVALID_ROLE: Role % is not valid', p_role;
  END IF;

  -- Generate a new UUID for the user
  v_user_id := gen_random_uuid();

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
$$;

CREATE OR REPLACE FUNCTION delete_user_with_auth(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  -- Authorization: Only system admins can delete users
  SELECT role INTO v_caller_role FROM users WHERE id = auth.uid();
  IF v_caller_role IS NULL OR v_caller_role != 'sysadmin' THEN
    RAISE EXCEPTION 'FORBIDDEN: Only system administrators can delete users';
  END IF;

  -- Prevent self-deletion
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'FORBIDDEN: Cannot delete your own account';
  END IF;

  -- Delete the user from public.users
  DELETE FROM users WHERE id = p_user_id;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- =========================================================================
-- 2. ADD SUPERVISOR RLS POLICY ON gate_logs
-- =========================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gate_logs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Supervisors can view supervised gate logs" ON gate_logs';
    EXECUTE '
      CREATE POLICY "Supervisors can view supervised gate logs"
      ON gate_logs
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = ''supervisor''
          AND gate_logs.gate_id::text = ANY(users.supervised_gates)
        )
      )
    ';
  END IF;
END $$;

-- =========================================================================
-- 3. ADD OPERATOR RLS POLICY ON students
-- =========================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'students') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Operators can view basic student info" ON students';
    EXECUTE '
      CREATE POLICY "Operators can view basic student info"
      ON students
      FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN (''operator'', ''supervisor''))
      )
    ';
  END IF;
END $$;

-- =========================================================================
-- 4. ADD OPERATOR RLS POLICY ON alerts
-- =========================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alerts') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Operators can view alerts for their gate" ON alerts';
    EXECUTE '
      CREATE POLICY "Operators can view alerts for their gate"
      ON alerts
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
          AND u.role = ''operator''
          AND (
            u.gate_id = alerts.gate_id
            OR alerts.gate_id IS NULL
          )
        )
      )
    ';
  END IF;
END $$;

-- =========================================================================
-- 5. AUTOMATIC SESSION REVOCATION ON ROLE/STATUS CHANGE
-- =========================================================================

DROP FUNCTION IF EXISTS notify_session_invalidation() CASCADE;

CREATE OR REPLACE FUNCTION notify_session_invalidation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND (OLD.role != NEW.role OR OLD.status != NEW.status)) THEN
    PERFORM pg_notify(
      'session_invalidation',
      json_build_object(
        'user_id', NEW.id,
        'old_role', OLD.role,
        'new_role', NEW.role,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'timestamp', NOW()
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trigger_notify_session_invalidation ON users';
    EXECUTE 'CREATE TRIGGER trigger_notify_session_invalidation AFTER UPDATE ON users FOR EACH ROW EXECUTE FUNCTION notify_session_invalidation()';
  END IF;
END $$;

-- =========================================================================
-- 6. AUDIT COMMENTS
-- =========================================================================

COMMENT ON FUNCTION create_user_with_auth IS 'SECURED: Only callable by system admins. Validates role before insertion.';
COMMENT ON FUNCTION delete_user_with_auth IS 'SECURED: Only callable by system admins. Prevents self-deletion.';
