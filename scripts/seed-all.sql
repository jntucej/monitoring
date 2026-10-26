-- SECURITY: No plaintext credentials in this file. All passwords/PINs must be rotated out-of-band before or after seeding. See docs/CREDENTIALS.md.
-- Seed all gate monitor users and config roles
-- Passwords/PINs: SET_VIA_ENV_OR_OOB_ROTATION — no literals are shipped here.
-- The GUCs `app.seed_password` / `app.seed_pin` can be set by the caller for dev only;
-- they must NOT be set in production. When unset the hashes resolve to NULL so the
-- account is created with no usable credential and forces first-login rotation.

-- Insert sysadmin with known ID
-- SET_VIA_ENV_OR_OOB_ROTATION
INSERT INTO users (id, unique_id, name, role, email, status, password_hash, initial_pin_hash, pin_must_change)
VALUES (
  '80eb29e3-7e71-48cb-a44c-6e0caa7f83f5',
  'SYSADMIN',
  'System Admin',
  'sysadmin',
  'sysadmin@college.edu',
  'ACTIVE',
  CASE WHEN current_setting('app.seed_password', true) <> ''
       THEN crypt(current_setting('app.seed_password', true), gen_salt('bf', 10))
       ELSE NULL END,
  CASE WHEN current_setting('app.seed_pin', true) <> ''
       THEN crypt(current_setting('app.seed_pin', true), gen_salt('bf', 10))
       ELSE NULL END,
  true
) ON CONFLICT (unique_id) DO NOTHING;

-- Insert other role users with random UUIDs
-- SET_VIA_ENV_OR_OOB_ROTATION
-- Each user's password/PIN must be provided out-of-band; NULL means "no credential set".
INSERT INTO users (unique_id, name, role, email, status, password_hash, initial_pin_hash, pin_must_change)
VALUES
  ('ADMIN', 'Campus Admin', 'admin', 'admin@college.edu', 'ACTIVE', NULL, NULL, true),
  ('OPERATOR', 'Gate Operator', 'operator', 'operator@college.edu', 'ACTIVE', NULL, NULL, true),
  ('SUPERVISOR', 'Gate Supervisor', 'supervisor', 'supervisor@college.edu', 'ACTIVE', NULL, NULL, true),
  ('WARDEN', 'Hostel Warden', 'hostel_manager', 'warden@college.edu', 'ACTIVE', NULL, NULL, true),
  ('HOD', 'Head of Department', 'hod', 'hod@college.edu', 'ACTIVE', NULL, NULL, true),
  ('FACULTY', 'Faculty Member', 'faculty', 'faculty@college.edu', 'ACTIVE', NULL, NULL, true),
  ('STAFF', 'Office Staff', 'staff', 'staff@college.edu', 'ACTIVE', NULL, NULL, true),
  ('WORKER', 'Support Worker', 'worker', 'worker@college.edu', 'ACTIVE', NULL, NULL, true),
  ('GUARDIAN', 'Parent Guardian', 'guardian', 'guardian@college.edu', 'ACTIVE', NULL, NULL, true),
  ('STUDENT', 'Demo Student', 'student', 'student@college.edu', 'ACTIVE', NULL, NULL, true),
  ('VISITOR', 'Demo Visitor', 'visitor', 'visitor@college.edu', 'ACTIVE', NULL, NULL, true)
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
