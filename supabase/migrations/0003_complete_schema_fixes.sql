-- Gate Monitoring System - Complete Schema Fixes
-- This migration addresses missing components and ensures schema completeness

-- 1. Create missing user_student_mapping table referenced in RLS policies
CREATE TABLE IF NOT EXISTS user_student_mapping (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, student_id)
);

-- 2. Add missing foreign key constraints
-- Add foreign key constraint for users.gate_id
ALTER TABLE users
ADD CONSTRAINT fk_users_gate_id
FOREIGN KEY (gate_id) REFERENCES gates(id) ON DELETE SET NULL;

-- Add foreign key constraint for users.parent_id
ALTER TABLE users
ADD CONSTRAINT fk_users_parent_id
FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add foreign key constraint for students.warden_id
ALTER TABLE students
ADD CONSTRAINT fk_students_warden_id
FOREIGN KEY (warden_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add foreign key constraint for campus_occupancy.last_gate_id
ALTER TABLE campus_occupancy
ADD CONSTRAINT fk_campus_occupancy_last_gate_id
FOREIGN KEY (last_gate_id) REFERENCES gates(id) ON DELETE SET NULL;

-- Add foreign key constraint for campus_occupancy.last_log_id
ALTER TABLE campus_occupancy
ADD CONSTRAINT fk_campus_occupancy_last_log_id
FOREIGN KEY (last_log_id) REFERENCES gate_logs(id) ON DELETE SET NULL;

-- Add foreign key constraint for gate_logs.original_scan_id
ALTER TABLE gate_logs
ADD CONSTRAINT fk_gate_logs_original_scan_id
FOREIGN KEY (original_scan_id) REFERENCES gate_logs(id) ON DELETE SET NULL;

-- 3. Add missing CHECK constraints for enum-like fields
-- Add CHECK constraint for gate_logs.direction
ALTER TABLE gate_logs
ADD CONSTRAINT chk_gate_logs_direction
CHECK (direction IN ('IN', 'OUT'));

-- Add CHECK constraint for gate_logs.reason
ALTER TABLE gate_logs
ADD CONSTRAINT chk_gate_logs_reason
CHECK (reason IN ('Home Out', 'Day Out', 'Leave', 'Regular'));

-- Add CHECK constraint for gate_passes.reason
ALTER TABLE gate_passes
ADD CONSTRAINT chk_gate_passes_reason
CHECK (reason IN ('Home Out', 'Day Out', 'Leave', 'Regular'));

-- Add CHECK constraint for gate_passes.parent_status
ALTER TABLE gate_passes
ADD CONSTRAINT chk_gate_passes_parent_status
CHECK (parent_status IN ('PENDING', 'APPROVED', 'REJECTED', 'APPROVED_PARENT', 'APPROVED_ADMIN', 'COMPLETED'));

-- Add CHECK constraint for gate_passes.admin_status
ALTER TABLE gate_passes
ADD CONSTRAINT chk_gate_passes_admin_status
CHECK (admin_status IN ('PENDING', 'APPROVED', 'REJECTED', 'APPROVED_PARENT', 'APPROVED_ADMIN', 'COMPLETED'));

-- Add CHECK constraint for gate_passes.final_status
ALTER TABLE gate_passes
ADD CONSTRAINT chk_gate_passes_final_status
CHECK (final_status IN ('PENDING', 'APPROVED', 'REJECTED', 'APPROVED_PARENT', 'APPROVED_ADMIN', 'COMPLETED'));

-- Add CHECK constraint for alerts.severity
ALTER TABLE alerts
ADD CONSTRAINT chk_alerts_severity
CHECK (severity IN ('low', 'medium', 'high', 'critical'));

-- 4. Add missing unique constraints
-- Ensure student roll numbers are unique
ALTER TABLE students
ADD CONSTRAINT uq_students_roll
UNIQUE (roll);

-- 5. Add missing indexes for performance
-- Index for gate_logs.timestamp (already exists, but let's ensure it's there)
CREATE INDEX IF NOT EXISTS idx_gate_logs_timestamp ON gate_logs(timestamp);

-- Index for gate_logs.direction (already exists, but let's ensure it's there)
CREATE INDEX IF NOT EXISTS idx_gate_logs_direction ON gate_logs(direction);

-- Index for gate_logs.gate_id (already exists, but let's ensure it's there)
CREATE INDEX IF NOT EXISTS idx_gate_logs_gate_id ON gate_logs(gate_id);

-- Index for gate_logs.student_id (already exists, but let's ensure it's there)
CREATE INDEX IF NOT EXISTS idx_gate_logs_student_id ON gate_logs(student_id);

-- Index for gate_passes.student_id (already exists, but let's ensure it's there)
CREATE INDEX IF NOT EXISTS idx_gate_passes_student_id ON gate_passes(student_id);

-- Index for gate_passes.final_status (already exists, but let's ensure it's there)
CREATE INDEX IF NOT EXISTS idx_gate_passes_final_status ON gate_passes(final_status);

-- Index for users.email (already exists, but let's ensure it's there)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index for users.employee_id (already exists, but let's ensure it's there)
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);

-- Index for campus_occupancy.current_status (already exists, but let's ensure it's there)
CREATE INDEX IF NOT EXISTS idx_campus_occupancy_status ON campus_occupancy(current_status);

-- Additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gate_passes_requested_at ON gate_passes(requested_at);
CREATE INDEX IF NOT EXISTS idx_gate_passes_from_datetime ON gate_passes(from_datetime);
CREATE INDEX IF NOT EXISTS idx_gate_passes_to_datetime ON gate_passes(to_datetime);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(active);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- 6. Fix the user_student_mapping function to work with the actual table
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

-- 7. Create a function to maintain user_student_mapping table
CREATE OR REPLACE FUNCTION maintain_user_student_mapping()
RETURNS TRIGGER AS $$
BEGIN
  -- When a student is created, map the student to their user account
  IF TG_OP = 'INSERT' AND NEW.id IS NOT NULL THEN
    INSERT INTO user_student_mapping (user_id, student_id)
    VALUES (NEW.id, NEW.id)
    ON CONFLICT (user_id, student_id) DO NOTHING;
  END IF;

  -- When a student's parent_id is updated, create mapping
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.parent_id IS NOT NULL THEN
      INSERT INTO user_student_mapping (user_id, student_id)
      VALUES (NEW.parent_id, NEW.id)
      ON CONFLICT (user_id, student_id) DO NOTHING;
    END IF;
  END IF;

  -- When a student is deleted, remove mappings
  IF TG_OP = 'DELETE' THEN
    DELETE FROM user_student_mapping WHERE student_id = OLD.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to maintain user_student_mapping
CREATE TRIGGER trigger_maintain_user_student_mapping
AFTER INSERT OR UPDATE OR DELETE ON students
FOR EACH ROW
EXECUTE FUNCTION maintain_user_student_mapping();

-- 9. Create a function to update user_student_mapping when parent_id changes
CREATE OR REPLACE FUNCTION update_user_student_mapping_on_parent_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If parent_id is being set or changed
  IF NEW.parent_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.parent_id != OLD.parent_id) THEN
    -- Remove old mapping if parent_id is being changed
    IF TG_OP = 'UPDATE' AND OLD.parent_id IS NOT NULL THEN
      DELETE FROM user_student_mapping WHERE user_id = OLD.parent_id AND student_id = NEW.id;
    END IF;

    -- Add new mapping
    INSERT INTO user_student_mapping (user_id, student_id)
    VALUES (NEW.parent_id, NEW.id)
    ON CONFLICT (user_id, student_id) DO NOTHING;
  END IF;

  -- If parent_id is being set to NULL, remove mapping
  IF TG_OP = 'UPDATE' AND NEW.parent_id IS NULL AND OLD.parent_id IS NOT NULL THEN
    DELETE FROM user_student_mapping WHERE user_id = OLD.parent_id AND student_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger to update user_student_mapping when parent_id changes
CREATE TRIGGER trigger_update_user_student_mapping_on_parent_change
AFTER UPDATE ON students
FOR EACH ROW
WHEN (OLD.parent_id IS DISTINCT FROM NEW.parent_id)
EXECUTE FUNCTION update_user_student_mapping_on_parent_change();

-- 11. Create a function to update user_student_mapping when user parent_id changes
CREATE OR REPLACE FUNCTION update_user_student_mapping_on_user_parent_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If a user's parent_id is being set or changed
  IF NEW.parent_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.parent_id != OLD.parent_id) THEN
    -- Find all students where this user is the parent
    INSERT INTO user_student_mapping (user_id, student_id)
    SELECT NEW.id, id FROM students WHERE parent_id = NEW.id
    ON CONFLICT (user_id, student_id) DO NOTHING;
  END IF;

  -- If a user's parent_id is being set to NULL, remove all mappings for this user
  IF TG_OP = 'UPDATE' AND NEW.parent_id IS NULL AND OLD.parent_id IS NOT NULL THEN
    DELETE FROM user_student_mapping WHERE user_id = OLD.parent_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Create trigger to update user_student_mapping when user parent_id changes
CREATE TRIGGER trigger_update_user_student_mapping_on_user_parent_change
AFTER UPDATE ON users
FOR EACH ROW
WHEN (OLD.parent_id IS DISTINCT FROM NEW.parent_id)
EXECUTE FUNCTION update_user_student_mapping_on_user_parent_change();

-- 13. Ensure RLS is enabled on the new table
ALTER TABLE user_student_mapping ENABLE ROW LEVEL SECURITY;

-- 14. Create RLS policies for user_student_mapping
-- Allow users to view their own mappings
CREATE POLICY "Users can view their own student mappings"
ON user_student_mapping
FOR SELECT
USING (user_id = auth.uid());

-- Allow admins to view all mappings
CREATE POLICY "Admins can view all student mappings"
ON user_student_mapping
FOR SELECT
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 15. Fix existing RLS policies that reference the user_student_mapping function
-- Update the students RLS policy for students
CREATE OR REPLACE POLICY "Students can view their own data"
ON students
FOR SELECT
USING (id = (SELECT student_id FROM user_student_mapping WHERE user_id = auth.uid()));

-- 16. Add missing RLS policies for tables that might not have them
-- Ensure all tables have RLS enabled (already done in 0002, but let's verify)
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

-- 17. Add any missing RLS policies for completeness
-- Ensure gate_passes has proper RLS policies
CREATE OR REPLACE POLICY "Students can view their own gate passes"
ON gate_passes
FOR SELECT
USING (student_id = (SELECT student_id FROM user_student_mapping WHERE user_id = auth.uid()));

CREATE OR REPLACE POLICY "Parents can view gate passes for their children"
ON gate_passes
FOR SELECT
USING (student_id IN (SELECT student_id FROM user_student_mapping WHERE user_id = auth.uid()));

-- 18. Add a function to get all students for a parent (used in RLS policies)
CREATE OR REPLACE FUNCTION get_parent_students(parent_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT student_id FROM user_student_mapping WHERE user_id = parent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 19. Update the gate_passes RLS policy for parents to use the new function
CREATE OR REPLACE POLICY "Parents can view gate passes for their children"
ON gate_passes
FOR SELECT
USING (student_id IN (SELECT get_parent_students(auth.uid())));

-- 20. Add a function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM users WHERE id = user_id AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 21. Add a function to check if a user is a sysadmin
CREATE OR REPLACE FUNCTION is_sysadmin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM users WHERE id = user_id AND role = 'sysadmin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 22. Add a function to check if a user is a warden
CREATE OR REPLACE FUNCTION is_warden(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM users WHERE id = user_id AND role = 'warden');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 23. Add a function to check if a user is an operator
CREATE OR REPLACE FUNCTION is_operator(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM users WHERE id = user_id AND role = 'operator');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 24. Add a function to check if a user is a supervisor
CREATE OR REPLACE FUNCTION is_supervisor(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM users WHERE id = user_id AND role = 'supervisor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 25. Add a function to get gates supervised by a user
CREATE OR REPLACE FUNCTION get_supervised_gates(user_id UUID)
RETURNS SETOF TEXT AS $$
BEGIN
  RETURN QUERY
  SELECT unnest(supervised_gates) FROM users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 26. Add a function to get the hostel assigned to a warden
CREATE OR REPLACE FUNCTION get_warden_hostel(user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT assigned_hostel FROM users WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 27. Update existing RLS policies to use the new helper functions
-- Update gates RLS policy for operators
CREATE OR REPLACE POLICY "Operators can view their assigned gates"
ON gates
FOR SELECT
USING (
  is_operator(auth.uid()) AND
  (id = (SELECT gate_id FROM users WHERE id = auth.uid()))
);

-- Update alerts RLS policy for supervisors
CREATE OR REPLACE POLICY "Supervisors can view alerts for their gates"
ON alerts
FOR SELECT
USING (
  is_supervisor(auth.uid()) AND
  (gate_id::TEXT = ANY((SELECT get_supervised_gates(auth.uid()))))
);

-- Update students RLS policy for wardens
CREATE OR REPLACE POLICY "Wardens can view students in their hostel"
ON students
FOR SELECT
USING (
  is_warden(auth.uid()) AND
  (hostel_block = get_warden_hostel(auth.uid()))
);

-- 28. Add comments to all tables and columns for documentation
COMMENT ON TABLE users IS 'System users with various roles for authentication and authorization';
COMMENT ON TABLE students IS 'Student records with personal and academic information';
COMMENT ON TABLE gates IS 'Physical gate locations and configurations';
COMMENT ON TABLE gate_logs IS 'Scan records for student entry and exit at gates';
COMMENT ON TABLE gate_passes IS 'Approval records for student gate passes';
COMMENT ON TABLE campus_occupancy IS 'Current campus occupancy status for students';
COMMENT ON TABLE alerts IS 'System alerts for security and safety issues';
COMMENT ON TABLE audit_logs IS 'Audit trail for system actions and changes';
COMMENT ON TABLE notifications IS 'User notifications for system events';
COMMENT ON TABLE sessions IS 'User session management for authentication';
COMMENT ON TABLE user_student_mapping IS 'Mapping between users and students for RLS policies';

-- 29. Add comments to key columns
COMMENT ON COLUMN users.role IS 'User role determining access permissions';
COMMENT ON COLUMN users.status IS 'Account status for security and access control';
COMMENT ON COLUMN students.roll IS 'Unique student roll number identifier';
COMMENT ON COLUMN students.parent_id IS 'Reference to parent user account';
COMMENT ON COLUMN students.warden_id IS 'Reference to warden user account';
COMMENT ON COLUMN gate_logs.direction IS 'Direction of scan: IN or OUT';
COMMENT ON COLUMN gate_logs.reason IS 'Reason for gate passage';
COMMENT ON COLUMN gate_passes.final_status IS 'Final approval status of gate pass';
COMMENT ON COLUMN campus_occupancy.current_status IS 'Current campus occupancy status: IN or OUT';
COMMENT ON COLUMN alerts.severity IS 'Severity level of alert: low, medium, high, critical';