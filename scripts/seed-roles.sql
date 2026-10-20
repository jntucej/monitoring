-- Seed demo role accounts (bcrypt-hashed; regenerate with: node scripts/generate-seed-roles.mjs)
-- Non-destructive: ON CONFLICT (unique_id) DO NOTHING.
BEGIN;
INSERT INTO users (id, unique_id, name, role, email, status, password_hash, initial_pin_hash, two_factor_enabled, pin_must_change)
VALUES
  ('80eb29e3-7e71-48cb-a44c-6e0caa7f83f5', 'SYSADMIN', 'System Admin', 'sysadmin', 'sysadmin@college.edu', 'ACTIVE', '$2b$10$RGJcdSAkt1CmWhFulmbVj.KnuqxRvUZ7VYYg5C.vEMu5BKhZBAXhm', '$2b$10$aTzYldmTHFjvAV7uJsaZo..cQQAnhba.Tw/s3sWIayYvohNyDcPRy', false, false),
  ('a0eb29e3-7e71-48cb-a44c-6e0caa7f83f1', 'ADMIN', 'Campus Admin', 'admin', 'admin@college.edu', 'ACTIVE', '$2b$10$hqAYZWrxDe7z5.yzrHIXzeJVK48zktmp3vikc2el0ZehkDCH2pzdm', '$2b$10$6tUgvBS2gZZtUHK9DjYlj.q8RL7944WK0gzeWGzHx/EZkRviAXw8m', false, false),
  ('30eb29e3-7e71-48cb-a44c-6e0caa7f83fa', 'PRINCIPAL', 'Principal', 'principal', 'principal@college.edu', 'ACTIVE', '$2b$10$RGJcdSAkt1CmWhFulmbVj.KnuqxRvUZ7VYYg5C.vEMu5BKhZBAXhm', '$2b$10$aTzYldmTHFjvAV7uJsaZo..cQQAnhba.Tw/s3sWIayYvohNyDcPRy', false, true),
  ('b0eb29e3-7e71-48cb-a44c-6e0caa7f83f2', 'VICE_PRINCIPAL', 'Vice Principal', 'vice_principal', 'viceprincipal@college.edu', 'ACTIVE', '$2b$10$ik73OPAcyPFgntsoUund3e8RCS2Ma5o0JLFJBUE5qWXT9rq8XHiUG', '$2b$10$DQ8GWDSUj5PzOeRnYahZK.BvjiqnJ5ttvQ03Eh/XSyV1MQQhhXFa.', false, true),
  ('c0eb29e3-7e71-48cb-a44c-6e0caa7f83f3', 'HOD', 'Head of Department', 'hod', 'hod@college.edu', 'ACTIVE', '$2b$10$ptSt9r3x6SFKqmRQnSViy.mFJGWC9YF4jrgXOZ/hSUDucm0Q2TJLC', '$2b$10$w38/N0rfsG9BRyY4FLlJzumEMPvAoq5/7tUI/jpXW21hH0qc/CUPK', false, false),
  ('40eb29e3-7e71-48cb-a44c-6e0caa7f83fb', 'CARETAKER', 'Hostel Caretaker', 'caretaker', 'caretaker@college.edu', 'ACTIVE', '$2b$10$RGJcdSAkt1CmWhFulmbVj.KnuqxRvUZ7VYYg5C.vEMu5BKhZBAXhm', '$2b$10$aTzYldmTHFjvAV7uJsaZo..cQQAnhba.Tw/s3sWIayYvohNyDcPRy', false, true),
  ('50eb29e3-7e71-48cb-a44c-6e0caa7f83fc', 'DEPUTY_WARDEN', 'Deputy Warden', 'deputy_warden', 'deputywarden@college.edu', 'ACTIVE', '$2b$10$RGJcdSAkt1CmWhFulmbVj.KnuqxRvUZ7VYYg5C.vEMu5BKhZBAXhm', '$2b$10$aTzYldmTHFjvAV7uJsaZo..cQQAnhba.Tw/s3sWIayYvohNyDcPRy', false, true),
  ('60eb29e3-7e71-48cb-a44c-6e0caa7f83fd', 'HOSTEL_MANAGER', 'Hostel Manager', 'hostel_manager', 'hostelmanager@college.edu', 'ACTIVE', '$2b$10$RGJcdSAkt1CmWhFulmbVj.KnuqxRvUZ7VYYg5C.vEMu5BKhZBAXhm', '$2b$10$aTzYldmTHFjvAV7uJsaZo..cQQAnhba.Tw/s3sWIayYvohNyDcPRy', false, true),
  ('70eb29e3-7e71-48cb-a44c-6e0caa7f83fe', 'OIE', 'OIE Officer', 'oie', 'oie@college.edu', 'ACTIVE', '$2b$10$RGJcdSAkt1CmWhFulmbVj.KnuqxRvUZ7VYYg5C.vEMu5BKhZBAXhm', '$2b$10$aTzYldmTHFjvAV7uJsaZo..cQQAnhba.Tw/s3sWIayYvohNyDcPRy', false, true),
  ('80eb29e3-7e71-48cb-a44c-6e0caa7f83ff', 'EXAM_BRANCH', 'Exam Branch', 'exam_branch', 'exambranch@college.edu', 'ACTIVE', '$2b$10$RGJcdSAkt1CmWhFulmbVj.KnuqxRvUZ7VYYg5C.vEMu5BKhZBAXhm', '$2b$10$aTzYldmTHFjvAV7uJsaZo..cQQAnhba.Tw/s3sWIayYvohNyDcPRy', false, true),
  ('90eb29e3-7e71-48cb-a44c-6e0caa7f83fa', 'EXAM_SUPERINTENDENT', 'Exam Superintendent', 'exam_superintendent', 'examsuperintendent@college.edu', 'ACTIVE', '$2b$10$RGJcdSAkt1CmWhFulmbVj.KnuqxRvUZ7VYYg5C.vEMu5BKhZBAXhm', '$2b$10$aTzYldmTHFjvAV7uJsaZo..cQQAnhba.Tw/s3sWIayYvohNyDcPRy', false, true),
  ('d0eb29e3-7e71-48cb-a44c-6e0caa7f83f4', 'OPERATOR', 'Gate Operator', 'operator', 'operator@college.edu', 'ACTIVE', '$2b$10$hqAYZWrxDe7z5.yzrHIXzeJVK48zktmp3vikc2el0ZehkDCH2pzdm', '$2b$10$Z7l/ZN3k5xsOma77gO9mmeKCk3IlE2/9PI54eRy/SkzykUqGvB0rq', false, true),
  ('e0eb29e3-7e71-48cb-a44c-6e0caa7f83f5', 'SUPERVISOR', 'Security Supervisor', 'supervisor', 'supervisor@college.edu', 'ACTIVE', '$2b$10$hqAYZWrxDe7z5.yzrHIXzeJVK48zktmp3vikc2el0ZehkDCH2pzdm', '$2b$10$6tUgvBS2gZZtUHK9DjYlj.q8RL7944WK0gzeWGzHx/EZkRviAXw8m', false, false),
  ('f0eb29e3-7e71-48cb-a44c-6e0caa7f83f6', 'MESS_INCHARGE', 'Mess Incharge', 'mess_incharge', 'mess@college.edu', 'ACTIVE', '$2b$10$RGJcdSAkt1CmWhFulmbVj.KnuqxRvUZ7VYYg5C.vEMu5BKhZBAXhm', '$2b$10$aTzYldmTHFjvAV7uJsaZo..cQQAnhba.Tw/s3sWIayYvohNyDcPRy', false, true),
  ('11eb29e3-7e71-48cb-a44c-6e0caa7f83f7', 'EMO', 'Electrical Maintenance Officer', 'emo', 'emo@college.edu', 'ACTIVE', '$2b$10$RGJcdSAkt1CmWhFulmbVj.KnuqxRvUZ7VYYg5C.vEMu5BKhZBAXhm', '$2b$10$aTzYldmTHFjvAV7uJsaZo..cQQAnhba.Tw/s3sWIayYvohNyDcPRy', false, true),
  ('22eb29e3-7e71-48cb-a44c-6e0caa7f83f8', 'PARENT', 'Parent', 'parent', 'parent@college.edu', 'ACTIVE', '$2b$10$RGJcdSAkt1CmWhFulmbVj.KnuqxRvUZ7VYYg5C.vEMu5BKhZBAXhm', '$2b$10$aTzYldmTHFjvAV7uJsaZo..cQQAnhba.Tw/s3sWIayYvohNyDcPRy', false, false),
  ('33eb29e3-7e71-48cb-a44c-6e0caa7f83f9', 'STUDENT', 'Student Demo', 'student', 'student@college.edu', 'ACTIVE', '$2b$10$hqAYZWrxDe7z5.yzrHIXzeJVK48zktmp3vikc2el0ZehkDCH2pzdm', '$2b$10$6tUgvBS2gZZtUHK9DjYlj.q8RL7944WK0gzeWGzHx/EZkRviAXw8m', false, false),
  ('44eb29e3-7e71-48cb-a44c-6e0caa7f83fa', 'VISITOR', 'Visitor Demo', 'visitor', 'visitor@college.edu', 'ACTIVE', '$2b$10$hqAYZWrxDe7z5.yzrHIXzeJVK48zktmp3vikc2el0ZehkDCH2pzdm', '$2b$10$6tUgvBS2gZZtUHK9DjYlj.q8RL7944WK0gzeWGzHx/EZkRviAXw8m', false, false)
ON CONFLICT (unique_id) DO UPDATE
  SET role = EXCLUDED.role,
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      status = EXCLUDED.status;
COMMIT;
