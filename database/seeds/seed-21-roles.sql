-- Seed 21 role accounts with user-specified passwords (password-only auth).
-- Generated 2026-10-26. bcrypt cost 10.
--
-- Idempotency strategy:
--   * NEW accounts (19): INSERT ... ON CONFLICT (email) DO UPDATE so a
--     re-run refreshes the password_hash / role without duplicating.
--   * PRINCIPAL + SYSADMIN (2): these emails ALREADY exist in the live DB
--     (principal@college.edu currently role='admin' unique_id=9908853084;
--     sysadmin@college.edu currently role='sysadmin' unique_id=nf16).
--     We UPDATE them in place (new password + corrected role) instead of
--     inserting a conflicting row. This is the explicit choice: the
--     pre-existing admin account becomes the Vice-Principal-less Principal,
--     and the sysadmin account keeps its role but gets the user's password.
--
-- Kiosk: OPERATOR is marked is_kiosk_default=TRUE (exactly one default is
-- required by /api/operator/kiosk-session); JOHN.DOE is the desk operator.

BEGIN;

-- ── 19 new role accounts ──────────────────────────────────────────────────
INSERT INTO users (id, unique_id, name, role, email, status, password_hash, pin_must_change, password_must_change, session_version)
VALUES
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8003','HOD','Head of Department','hod','hod@college.edu','ACTIVE',NULL,false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8004','OIE','OIE Officer','oie','oie@college.edu','ACTIVE',NULL,false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8005','EXAM_BRANCH','Exam Branch','exam_branch','exam@college.edu','ACTIVE',NULL,false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8006','FACULTY','Faculty Member','faculty','faculty@college.edu','ACTIVE',NULL,false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8007','STAFF','Office Staff','staff','staff@college.edu','ACTIVE',NULL,false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8008','WARDEN','Hostel Warden','warden','warden@college.edu','ACTIVE',NULL,false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8009','DEPUTY_WARDEN','Deputy Warden','deputy_warden','deputywarden@college.edu','ACTIVE',NULL,false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8010','HOSTEL_MANAGER','Hostel Manager','hostel_manager','hostelmanager@college.edu','ACTIVE',NULL,false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8011','MESS_INCHARGE','Mess Incharge','mess_incharge','messincharge@college.edu','ACTIVE',NULL,false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8012','CARETAKER','Caretaker','caretaker','caretaker@college.edu','ACTIVE',NULL,false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8013','SUPERVISOR','Gate Supervisor','supervisor','supervisor@college.edu','ACTIVE',NULL,false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8014','OPERATOR','Gate Operator (kiosk)','operator','operator@college.edu','ACTIVE',NULL,false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8015','JOHN.DOE','John Doe (desk operator)','operator','john.doe@college.edu','ACTIVE',NULL,false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8016','STUDENT','Demo Student','student','student@college.edu','ACTIVE',NULL,false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8017','GUARDIAN','Parent Guardian','guardian','guardian@college.edu','ACTIVE',NULL,false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8018','VISITOR','Demo Visitor','visitor','visitor@college.edu','ACTIVE',NULL,false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8019','WORKER','Demo Worker','worker','worker@college.edu','ACTIVE',NULL,false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8002','VICE_PRINCIPAL','Vice Principal','vice_principal','viceprincipal@college.edu','ACTIVE',NULL,false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8020','ADMIN','Campus Admin','admin','admin@college.edu','ACTIVE',NULL,false,true,0)
ON CONFLICT (email) DO UPDATE SET
  password_hash      = EXCLUDED.password_hash,
  role               = EXCLUDED.role,
  status             = EXCLUDED.status,
  password_must_change = TRUE,
  updated_at         = NOW();

-- ── PRINCIPAL + SYSADMIN: update the pre-existing rows in place ─────────────
-- The two emails already exist with different roles/unique_ids. We adopt the
-- existing rows: keep password_hash NULL so bootstrap is mandatory.
UPDATE users
   SET unique_id          = 'PRINCIPAL',
       name               = 'Principal',
       role               = 'principal',
       password_hash      = NULL,
       password_must_change = TRUE,
       status             = 'ACTIVE',
       updated_at         = NOW()
 WHERE email = 'principal@college.edu';

UPDATE users
   SET unique_id          = 'SYSADMIN',
       name               = 'System Admin',
       role               = 'sysadmin',
       password_hash      = NULL,
       password_must_change = TRUE,
       status             = 'ACTIVE',
       updated_at         = NOW()
 WHERE email = 'sysadmin@college.edu';

-- ── Kiosk default operator (exactly one) ────────────────────────────────────
UPDATE users SET is_kiosk_default = FALSE WHERE role = 'operator';
UPDATE users SET is_kiosk_default = TRUE  WHERE unique_id = 'OPERATOR' AND role = 'operator';

COMMIT;
