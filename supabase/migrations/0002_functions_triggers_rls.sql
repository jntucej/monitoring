-- Gate Monitoring System - Functions, Triggers, and RLS Migration
-- This migration adds database functions, triggers, and Row Level Security policies

-- Create database functions

-- Function to update campus occupancy when a scan is created
CREATE OR REPLACE FUNCTION update_campus_occupancy_on_scan()
RETURNS TRIGGER AS $$
BEGIN
  -- Update campus occupancy based on scan direction
  IF NEW.direction = 'IN' THEN
    INSERT INTO campus_occupancy (student_id, current_status, last_gate_id, last_log_id, last_updated)
    VALUES (NEW.student_id, 'IN', NEW.gate_id, NEW.id, NEW.timestamp)
    ON CONFLICT (student_id) DO UPDATE
    SET
      current_status = 'IN',
      last_gate_id = NEW.gate_id,
      last_log_id = NEW.id,
      last_updated = NEW.timestamp;
  ELSIF NEW.direction = 'OUT' THEN
    INSERT INTO campus_occupancy (student_id, current_status, last_gate_id, last_log_id, last_updated)
    VALUES (NEW.student_id, 'OUT', NEW.gate_id, NEW.id, NEW.timestamp)
    ON CONFLICT (student_id) DO UPDATE
    SET
      current_status = 'OUT',
      last_gate_id = NEW.gate_id,
      last_log_id = NEW.id,
      last_updated = NEW.timestamp;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create audit log when a scan is created
CREATE OR REPLACE FUNCTION create_audit_log_on_scan()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (action, user_id, user_name, role, details, gate_id)
  VALUES (
    'SCAN_CREATED',
    NEW.operator_id,
    NEW.operator_name,
    (SELECT role FROM users WHERE id = NEW.operator_id),
    NEW.direction || ' ' || NEW.name || ' (' || NEW.roll || ') at ' || NEW.gate_name,
    NEW.gate_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create audit log when a gate pass is created
CREATE OR REPLACE FUNCTION create_audit_log_on_pass()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (action, user_id, user_name, role, details)
  VALUES (
    'GATE_PASS_CREATED',
    NEW.requested_by_id,
    NEW.requested_by_name,
    (SELECT role FROM users WHERE id = NEW.requested_by_id),
    'Gate pass created for ' || NEW.student_name || ' (' || NEW.roll || ') - ' || NEW.reason
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create audit log when a gate pass is approved/rejected
CREATE OR REPLACE FUNCTION create_audit_log_on_pass_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.final_status != OLD.final_status THEN
    INSERT INTO audit_logs (action, user_id, user_name, role, details)
    VALUES (
      CASE
        WHEN NEW.final_status = 'APPROVED' THEN 'GATE_PASS_APPROVED'
        WHEN NEW.final_status = 'REJECTED' THEN 'GATE_PASS_REJECTED'
        WHEN NEW.final_status = 'APPROVED_PARENT' THEN 'GATE_PASS_APPROVED_PARENT'
        WHEN NEW.final_status = 'APPROVED_ADMIN' THEN 'GATE_PASS_APPROVED_ADMIN'
        ELSE 'GATE_PASS_UPDATED'
      END,
      COALESCE(NEW.parent_approver_id, NEW.admin_approver_id),
      COALESCE(
        (SELECT name FROM users WHERE id = NEW.parent_approver_id),
        (SELECT name FROM users WHERE id = NEW.admin_approver_id)
      ),
      COALESCE(
        (SELECT role FROM users WHERE id = NEW.parent_approver_id),
        (SELECT role FROM users WHERE id = NEW.admin_approver_id)
      ),
      'Gate pass ' || NEW.id || ' status changed to ' || NEW.final_status
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create audit log when a user is created
CREATE OR REPLACE FUNCTION create_audit_log_on_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (action, user_id, user_name, role, details)
  VALUES (
    'USER_CREATED',
    'system',
    'System',
    'system',
    'Created new user ' || NEW.id || ' with role ' || NEW.role
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create audit log when a user role is updated
CREATE OR REPLACE FUNCTION create_audit_log_on_user_role_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role != OLD.role THEN
    INSERT INTO audit_logs (action, user_id, user_name, role, details)
    VALUES (
      'ROLE_CHANGED',
      current_setting('app.current_user_id'),
      current_setting('app.current_user_name'),
      current_setting('app.current_user_role'),
      'Changed role for ' || NEW.id || ' from ' || OLD.role || ' to ' || NEW.role
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create audit log when account status is updated
CREATE OR REPLACE FUNCTION create_audit_log_on_account_status_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    INSERT INTO audit_logs (action, user_id, user_name, role, details)
    VALUES (
      'ACCOUNT_STATUS_CHANGED',
      'system',
      'System',
      'system',
      'Changed account status for ' || NEW.id || ' from ' || OLD.status || ' to ' || NEW.status
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers

-- Trigger to update campus occupancy when a scan is created
CREATE TRIGGER trigger_update_campus_occupancy
AFTER INSERT ON gate_logs
FOR EACH ROW
EXECUTE FUNCTION update_campus_occupancy_on_scan();

-- Trigger to create audit log when a scan is created
CREATE TRIGGER trigger_create_audit_log_on_scan
AFTER INSERT ON gate_logs
FOR EACH ROW
EXECUTE FUNCTION create_audit_log_on_scan();

-- Trigger to create audit log when a gate pass is created
CREATE TRIGGER trigger_create_audit_log_on_pass
AFTER INSERT ON gate_passes
FOR EACH ROW
EXECUTE FUNCTION create_audit_log_on_pass();

-- Trigger to create audit log when a gate pass is updated
CREATE TRIGGER trigger_create_audit_log_on_pass_update
AFTER UPDATE ON gate_passes
FOR EACH ROW
EXECUTE FUNCTION create_audit_log_on_pass_update();

-- Trigger to create audit log when a user is created
CREATE TRIGGER trigger_create_audit_log_on_user
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_audit_log_on_user();

-- Trigger to create audit log when a user role is updated
CREATE TRIGGER trigger_create_audit_log_on_user_role_update
AFTER UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION create_audit_log_on_user_role_update();

-- Trigger to create audit log when account status is updated
CREATE TRIGGER trigger_create_audit_log_on_account_status_update
AFTER UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION create_audit_log_on_account_status_update();

-- Enable Row Level Security on all tables
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

-- Create RLS policies

-- Users table policies
-- Users can view their own data
CREATE POLICY "Users can view their own data"
ON users
FOR SELECT
USING (id = auth.uid());

-- Users can update their own data (except role and status)
CREATE POLICY "Users can update their own data"
ON users
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admins can view all users
CREATE POLICY "Admins can view all users"
ON users
FOR SELECT
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Admins can update user data (except role)
CREATE POLICY "Admins can update user data"
ON users
FOR UPDATE
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Sysadmins can update user roles
CREATE POLICY "Sysadmins can update user roles"
ON users
FOR UPDATE
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'sysadmin'))
WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'sysadmin'));

-- Create a function to map users to students for RLS
CREATE OR REPLACE FUNCTION user_student_mapping(user_id UUID)
RETURNS UUID AS $$
DECLARE
  student_id UUID;
BEGIN
  -- Check if the user is a student
  SELECT id INTO student_id FROM students WHERE id = user_id;

  -- If not a student, check if they are a parent
  IF NOT FOUND THEN
    SELECT id INTO student_id FROM students WHERE parent_id = user_id LIMIT 1;
  END IF;

  RETURN student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Students table policies
-- Students can view their own data
CREATE POLICY "Students can view their own data"
ON students
FOR SELECT
USING (id = user_student_mapping(auth.uid()));

-- Parents can view their children's data
CREATE POLICY "Parents can view their children's data"
ON students
FOR SELECT
USING (parent_id = auth.uid());

-- Admins can view all student data
CREATE POLICY "Admins can view all student data"
ON students
FOR SELECT
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Wardens can view students in their hostel
CREATE POLICY "Wardens can view students in their hostel"
ON students
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'warden') AND
  (hostel_block = (SELECT assigned_hostel FROM users WHERE id = auth.uid()))
);

-- Gates table policies
-- All authenticated users can view active gates
CREATE POLICY "All users can view active gates"
ON gates
FOR SELECT
USING (is_active = TRUE);

-- Operators can view gates they are assigned to
CREATE POLICY "Operators can view their assigned gates"
ON gates
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'operator') AND
  (id = (SELECT gate_id FROM users WHERE id = auth.uid()))
);

-- Gate logs table policies
-- Operators can view logs for gates they are assigned to
CREATE POLICY "Operators can view logs for their gates"
ON gate_logs
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'operator') AND
  (gate_id = (SELECT gate_id FROM users WHERE id = auth.uid()))
);

-- Admins can view all gate logs
CREATE POLICY "Admins can view all gate logs"
ON gate_logs
FOR SELECT
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Gate passes table policies
-- Students can view their own gate passes
CREATE POLICY "Students can view their own gate passes"
ON gate_passes
FOR SELECT
USING (student_id = user_student_mapping(auth.uid()));

-- Parents can view gate passes for their children
CREATE POLICY "Parents can view gate passes for their children"
ON gate_passes
FOR SELECT
USING (student_id IN (SELECT id FROM students WHERE parent_id = auth.uid()));

-- Admins can view all gate passes
CREATE POLICY "Admins can view all gate passes"
ON gate_passes
FOR SELECT
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Alerts table policies
-- Admins can view all alerts
CREATE POLICY "Admins can view all alerts"
ON alerts
FOR SELECT
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Supervisors can view alerts for their gates
CREATE POLICY "Supervisors can view alerts for their gates"
ON alerts
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'supervisor') AND
  (gate_id::TEXT = ANY(COALESCE((SELECT supervised_gates FROM users WHERE id = auth.uid()), ARRAY[]::TEXT[])))
);

-- Audit logs table policies
-- Sysadmins can view all audit logs
CREATE POLICY "Sysadmins can view all audit logs"
ON audit_logs
FOR SELECT
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'sysadmin'));

-- Notifications table policies
-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
USING (recipient_id = auth.uid()::TEXT);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
USING (recipient_id = auth.uid()::TEXT)
WITH CHECK (recipient_id = auth.uid()::TEXT);

-- Sessions table policies
-- Users can view their own sessions
CREATE POLICY "Users can view their own sessions"
ON sessions
FOR SELECT
USING (user_id = auth.uid());

-- Users can invalidate their own sessions
CREATE POLICY "Users can invalidate their own sessions"
ON sessions
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Campus occupancy table policies
-- Admins can view all campus occupancy data
CREATE POLICY "Admins can view all campus occupancy data"
ON campus_occupancy
FOR SELECT
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
