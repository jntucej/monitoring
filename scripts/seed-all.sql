-- Seed all gate monitor users and config roles
-- Master PIN for most roles: 123456
-- Sysadmin password: junaid, pin: nf16

-- Insert sysadmin with known ID
INSERT INTO users (id, unique_id, name, role, email, status, password_hash, initial_pin_hash, two_factor_enabled, pin_must_change)
VALUES (
  '80eb29e3-7e71-48cb-a44c-6e0caa7f83f5',
  'SYSADMIN',
  'System Admin',
  'sysadmin',
  'sysadmin@college.edu',
  'ACTIVE',
  crypt(COALESCE(NULLIF(current_setting('app.seed_password', true), ''), 'sysadmin_secure_change_me'), gen_salt('bf', 10)),
  crypt(COALESCE(NULLIF(current_setting('app.seed_pin', true), ''), '654321'), gen_salt('bf', 10)),
  false,
  true
) ON CONFLICT (unique_id) DO NOTHING;

-- Insert other role users with random UUIDs
INSERT INTO users (unique_id, name, role, email, status, password_hash, initial_pin_hash, two_factor_enabled, pin_must_change)
VALUES
  ('ADMIN', 'Campus Admin', 'admin', 'admin@college.edu', 'ACTIVE',
   crypt('admin_change_me', gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), false, true),
  ('OPERATOR', 'Gate Operator', 'operator', 'operator@college.edu', 'ACTIVE',
   crypt('operator_change_me', gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), false, true),
  ('SUPERVISOR', 'Gate Supervisor', 'supervisor', 'supervisor@college.edu', 'ACTIVE',
   crypt('supervisor_change_me', gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), false, true),
  ('WARDEN', 'Hostel Warden', 'hostel_manager', 'warden@college.edu', 'ACTIVE',
   crypt('warden_change_me', gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), false, true),
  ('HOD', 'Head of Department', 'hod', 'hod@college.edu', 'ACTIVE',
   crypt('hod_change_me', gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), false, true),
  ('FACULTY', 'Faculty Member', 'faculty', 'faculty@college.edu', 'ACTIVE',
   crypt('faculty_change_me', gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), false, true),
  ('STAFF', 'Office Staff', 'staff', 'staff@college.edu', 'ACTIVE',
   crypt('staff_change_me', gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), false, true),
  ('WORKER', 'Support Worker', 'worker', 'worker@college.edu', 'ACTIVE',
   crypt('worker_change_me', gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), false, true),
  ('GUARDIAN', 'Parent Guardian', 'guardian', 'guardian@college.edu', 'ACTIVE',
   crypt('guardian_change_me', gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), false, true),
  ('STUDENT', 'Demo Student', 'student', 'student@college.edu', 'ACTIVE',
   crypt('student_change_me', gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), false, true),
  ('VISITOR', 'Demo Visitor', 'visitor', 'visitor@college.edu', 'ACTIVE',
   crypt('visitor_change_me', gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), false, true)
ON CONFLICT (unique_id) DO NOTHING;

-- Insert config roles
INSERT INTO config_roles (code, display_name, permissions, is_active)
VALUES
  ('sysadmin', 'System Admin', '{"all": true}'::jsonb, true),
  ('admin', 'Campus Admin', '{"gates": "read_write", "users": "read_write", "reports": "read"}'::jsonb, true),
  ('operator', 'Gate Operator', '{"gates": "read_write", "scans": "write"}'::jsonb, true),
  ('supervisor', 'Gate Supervisor', '{"gates": "read_write", "alerts": "read", "reports": "read"}'::jsonb, true),
  ('warden', 'Hostel Warden', '{"hostel": "read_write", "students": "read", "alerts": "read"}'::jsonb, false),
  ('hod', 'Head of Department', '{"department": "read_write", "reports": "read"}'::jsonb, true),
  ('faculty', 'Faculty Member', '{"classes": "read_write", "attendance": "read"}'::jsonb, true),
  ('staff', 'Office Staff', '{"office": "read_write"}'::jsonb, true),
  ('worker', 'Support Worker', '{"workers": "read"}'::jsonb, true),
  ('guardian', 'Parent Guardian', '{"student": "read", "notifications": "read"}'::jsonb, true),
  ('student', 'Student', '{"self": "read_write"}'::jsonb, true),
  ('visitor', 'Visitor', '{"visitor": "read_write"}'::jsonb, true)
ON CONFLICT (code) DO NOTHING;

SELECT unique_id, role, email, status FROM users ORDER BY role;
SELECT code, display_name FROM config_roles ORDER BY code;
