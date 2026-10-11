-- Seed all gate monitor users and config roles
-- Master PIN for most roles: 123456
-- Sysadmin password: junaid, pin: nf16

-- Insert sysadmin with known ID
INSERT INTO users (id, unique_id, name, role, email, status, password_hash, initial_pin_hash, two_factor_enabled)
VALUES (
  '80eb29e3-7e71-48cb-a44c-6e0caa7f83f5',
  'SYSADMIN',
  'System Admin',
  'sysadmin',
  'sysadmin@college.edu',
  'ACTIVE',
  crypt('junaid', gen_salt('bf', 10)),
  crypt('nf16', gen_salt('bf', 10)),
  false
) ON CONFLICT (unique_id) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  initial_pin_hash = EXCLUDED.initial_pin_hash;

-- Insert other role users with random UUIDs
INSERT INTO users (unique_id, name, role, email, status, password_hash, initial_pin_hash, two_factor_enabled)
VALUES
  ('ADMIN', 'Campus Admin', 'admin', 'admin@college.edu', 'ACTIVE',
   crypt('admin123', gen_salt('bf', 10)), crypt('123456', gen_salt('bf', 10)), false),
  ('OPERATOR', 'Gate Operator', 'operator', 'operator@college.edu', 'ACTIVE',
   crypt('operator123', gen_salt('bf', 10)), crypt('123456', gen_salt('bf', 10)), false),
  ('SUPERVISOR', 'Gate Supervisor', 'supervisor', 'supervisor@college.edu', 'ACTIVE',
   crypt('supervisor123', gen_salt('bf', 10)), crypt('123456', gen_salt('bf', 10)), false),
  ('WARDEN', 'Hostel Warden', 'warden', 'warden@college.edu', 'ACTIVE',
   crypt('warden123', gen_salt('bf', 10)), crypt('123456', gen_salt('bf', 10)), false),
  ('HOD', 'Head of Department', 'hod', 'hod@college.edu', 'ACTIVE',
   crypt('hod123', gen_salt('bf', 10)), crypt('123456', gen_salt('bf', 10)), false),
  ('FACULTY', 'Faculty Member', 'faculty', 'faculty@college.edu', 'ACTIVE',
   crypt('faculty123', gen_salt('bf', 10)), crypt('123456', gen_salt('bf', 10)), false),
  ('STAFF', 'Office Staff', 'staff', 'staff@college.edu', 'ACTIVE',
   crypt('staff123', gen_salt('bf', 10)), crypt('123456', gen_salt('bf', 10)), false),
  ('WORKER', 'Support Worker', 'worker', 'worker@college.edu', 'ACTIVE',
   crypt('worker123', gen_salt('bf', 10)), crypt('123456', gen_salt('bf', 10)), false),
  ('GUARDIAN', 'Parent Guardian', 'guardian', 'guardian@college.edu', 'ACTIVE',
   crypt('guardian123', gen_salt('bf', 10)), crypt('123456', gen_salt('bf', 10)), false),
  ('STUDENT', 'Demo Student', 'student', 'student@college.edu', 'ACTIVE',
   crypt('student123', gen_salt('bf', 10)), crypt('123456', gen_salt('bf', 10)), false),
  ('VISITOR', 'Demo Visitor', 'visitor', 'visitor@college.edu', 'ACTIVE',
   crypt('visitor123', gen_salt('bf', 10)), crypt('123456', gen_salt('bf', 10)), false)
ON CONFLICT (unique_id) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  initial_pin_hash = EXCLUDED.initial_pin_hash;

-- Insert config roles
INSERT INTO config_roles (code, display_name, permissions, is_active)
VALUES
  ('sysadmin', 'System Admin', '{"all": true}'::jsonb, true),
  ('admin', 'Campus Admin', '{"gates": "read_write", "users": "read_write", "reports": "read"}'::jsonb, true),
  ('operator', 'Gate Operator', '{"gates": "read_write", "scans": "write"}'::jsonb, true),
  ('supervisor', 'Gate Supervisor', '{"gates": "read_write", "alerts": "read", "reports": "read"}'::jsonb, true),
  ('warden', 'Hostel Warden', '{"hostel": "read_write", "students": "read", "alerts": "read"}'::jsonb, true),
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
