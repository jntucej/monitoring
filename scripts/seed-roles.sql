BEGIN;

-- ─── 1. Sysadmin (bootstrap, matches original seed) ─────────────────────────
INSERT INTO users (id, unique_id, name, role, email, status,
                   password_hash, initial_pin_hash,
                   pin_must_change)
VALUES (
  '80eb29e3-7e71-48cb-a44c-6e0caa7f83f5',
  'SYSADMIN',
  'System Admin',
  'sysadmin',
  'sysadmin@college.edu',
  'ACTIVE',
  crypt(COALESCE(NULLIF(current_setting('app.seed_password', true), ''),
                 'sysadmin_secure_change_me'), gen_salt('bf', 10)),
  crypt(COALESCE(NULLIF(current_setting('app.seed_pin', true), ''),
                 '654321'), gen_salt('bf', 10)),
  true
) ON CONFLICT (unique_id) DO NOTHING;

-- ─── 2. Every other role ─────────────────────────────────────────────────────
INSERT INTO users (id, unique_id, name, role, email, status,
                   password_hash, initial_pin_hash,
                   pin_must_change)
VALUES
  -- Tier 0: admin
  (gen_random_uuid(), 'ADMIN',              'Campus Admin',          'admin',              'admin@college.edu',              'ACTIVE', crypt('admin_change_me',        gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), true),

  -- Tier 1: executive
  (gen_random_uuid(), 'PRINCIPAL',          'Principal',             'principal',          'principal@college.edu',          'ACTIVE', crypt('principal_change_me',    gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), true),
  (gen_random_uuid(), 'VICE_PRINCIPAL',     'Vice Principal',        'vice_principal',     'viceprincipal@college.edu',      'ACTIVE', crypt('vp_change_me',           gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), true),

  -- Tier 2: hostel hierarchy
  (gen_random_uuid(), 'CARETAKER',          'Hostel Caretaker',      'caretaker',          'caretaker@college.edu',          'ACTIVE', crypt('caretaker_change_me',    gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), true),
  (gen_random_uuid(), 'DEPUTY_WARDEN',      'Deputy Warden',         'deputy_warden',      'deputywarden@college.edu',       'ACTIVE', crypt('deputy_change_me',       gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), true),
  (gen_random_uuid(), 'HOSTEL_MANAGER',     'Hostel Manager',        'hostel_manager',     'hostelmanager@college.edu',      'ACTIVE', crypt('hm_change_me',           gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), true),
  (gen_random_uuid(), 'WARDEN',             'Legacy Warden',         'hostel_manager',     'warden@college.edu',             'ACTIVE', crypt('warden_change_me',       gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), true),

  -- Tier 2: exam hierarchy
  (gen_random_uuid(), 'OIE',                'OIE Officer',           'oie',                'oie@college.edu',                'ACTIVE', crypt('oie_change_me',          gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), true),
  (gen_random_uuid(), 'EXAM_BRANCH',        'Exam Branch',           'exam_branch',        'exambranch@college.edu',         'ACTIVE', crypt('eb_change_me',           gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), true),
  (gen_random_uuid(), 'EXAM_SUPERINTENDENT','Exam Superintendent',   'exam_superintendent','examsuperintendent@college.edu', 'ACTIVE', crypt('es_change_me',           gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), true),

  -- Tier 2: faculty / staff
  (gen_random_uuid(), 'HOD',                'Head of Department',    'hod',                'hod@college.edu',                'ACTIVE', crypt('hod_change_me',          gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), true),
  (gen_random_uuid(), 'FACULTY',            'Faculty Member',        'faculty',            'faculty@college.edu',            'ACTIVE', crypt('faculty_change_me',      gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), true),
  (gen_random_uuid(), 'STAFF',              'Office Staff',          'staff',              'staff@college.edu',              'ACTIVE', crypt('staff_change_me',        gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), true),

  -- Tier 2: mess + maintenance
  (gen_random_uuid(), 'MESS_INCHARGE',      'Mess Incharge',         'mess_incharge',      'messincharge@college.edu',       'ACTIVE', crypt('mess_change_me',         gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), true),
  (gen_random_uuid(), 'EMO',                'Electrical Officer',    'emo',                'emo@college.edu',                'ACTIVE', crypt('emo_change_me',          gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), true),

  -- Tier 3: gate / supervisor
  (gen_random_uuid(), 'SUPERVISOR',         'Gate Supervisor',       'supervisor',         'supervisor@college.edu',         'ACTIVE', crypt('supervisor_change_me',   gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), true),
  (gen_random_uuid(), 'OPERATOR',           'Gate Operator',         'operator',           'operator@college.edu',           'ACTIVE', crypt('operator_change_me',     gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), true),

  -- Tier 4: end-users
  (gen_random_uuid(), 'STUDENT',            'Demo Student',          'student',            'student@college.edu',            'ACTIVE', crypt('student_change_me',      gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), true),
  (gen_random_uuid(), 'PARENT',             'Demo Parent',           'parent',             'parent@college.edu',             'ACTIVE', crypt('parent_change_me',       gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), true),
  (gen_random_uuid(), 'GUARDIAN',           'Demo Guardian',         'guardian',           'guardian@college.edu',           'ACTIVE', crypt('guardian_change_me',     gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), true),
  (gen_random_uuid(), 'WORKER',             'Support Worker',        'worker',             'worker@college.edu',             'ACTIVE', crypt('worker_change_me',       gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), true),
  (gen_random_uuid(), 'VISITOR',            'Demo Visitor',          'visitor',            'visitor@college.edu',            'ACTIVE', crypt('visitor_change_me',      gen_salt('bf', 10)), crypt('654321', gen_salt('bf', 10)), true)
ON CONFLICT (unique_id) DO NOTHING;

-- ─── 3. Role registry entries (must exist for validate_user_role trigger) ───
INSERT INTO config_roles_registry (code, display_name, is_privileged, is_super)
VALUES
  ('sysadmin',           'System Administrator',         true,  true),
  ('admin',              'Administrator',                true,  false),
  ('principal',          'Principal',                    false, false),
  ('vice_principal',     'Vice Principal',               false, false),
  ('caretaker',          'Caretaker',                    false, false),
  ('deputy_warden',      'Deputy Warden',                false, false),
  ('hostel_manager',     'Hostel Manager',               false, false),
  ('oie',                'Officer Incharge Examinations',false, false),
  ('exam_branch',        'Exam Branch',                  false, false),
  ('exam_superintendent','Exam Superintendent',          false, false),
  ('hod',                'Head of Department',           false, false),
  ('faculty',            'Faculty',                      false, false),
  ('staff',              'Staff',                        false, false),
  ('mess_incharge',      'Mess Incharge',                false, false),
  ('emo',                'Electrical Maintenance Officer',false,false),
  ('supervisor',         'Gate Supervisor',              false, false),
  ('operator',           'Gate Operator',                false, false),
  ('student',            'Student',                      false, false),
  ('parent',             'Parent',                       false, false),
  ('guardian',           'Guardian',                     false, false),
  ('worker',             'Worker',                       false, false),
  ('visitor',            'Visitor',                      false, false)
ON CONFLICT (code) DO NOTHING;

-- ─── 4. Summary ──────────────────────────────────────────────────────────────
SELECT 'roles_seeded' AS status, COUNT(*) AS total FROM users WHERE status = 'ACTIVE';
COMMIT;
