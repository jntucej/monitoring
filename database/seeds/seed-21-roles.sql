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
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8003','HOD','Head of Department','hod','hod@college.edu','ACTIVE','$2b$10$84uPvVzwyQ1IYEhjb5ksnOdSyd.itEZZnV3mJBJsIP2hlcE6tdXg6',false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8004','OIE','OIE Officer','oie','oie@college.edu','ACTIVE','$2b$10$nGqS.xenEhM2jYIxpshcqulmwvV.62nq5UlO2lVRZdANqbl/MqZxW',false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8005','EXAM_BRANCH','Exam Branch','exam_branch','exam@college.edu','ACTIVE','$2b$10$vG.2r9xnxcZDWSRUIwXfJe2D2ZirY.RtXNyFc6XtRuotJ1oPOdr/.',false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8006','FACULTY','Faculty Member','faculty','faculty@college.edu','ACTIVE','$2b$10$rzzcXjefLR7w93ymhbFDNeFxLs2wL.plnA5M9LkhvRT9K3jVtaDwS',false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8007','STAFF','Office Staff','staff','staff@college.edu','ACTIVE','$2b$10$Vrg9hx4UciOKBSTr9mPqse7prZMho.rlTwde6MW.kVxSHC9aBl9V2',false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8008','WARDEN','Hostel Warden','warden','warden@college.edu','ACTIVE','$2b$10$kdmYiyMVuvlqOIofRCPvmu002tTWH0ZxMqy6PhhhQbekwLm9K/BLK',false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8009','DEPUTY_WARDEN','Deputy Warden','deputy_warden','deputywarden@college.edu','ACTIVE','$2b$10$YZS99KYDC2W3TberYDtgoOzAvoVDZYm021i3Mo1AvLZkzBQsRzZQm',false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8010','HOSTEL_MANAGER','Hostel Manager','hostel_manager','hostelmanager@college.edu','ACTIVE','$2b$10$M5r/34dDhoPh0epUdVViSOGrfbDpidveAcV1q9vcDwu6Whg8IhdTO',false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8011','MESS_INCHARGE','Mess Incharge','mess_incharge','messincharge@college.edu','ACTIVE','$2b$10$gVIciBy6DfJZZKGavJWU1.bvC2RDmdbeFQZdmzA6xxjJ7hUgSRGim',false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8012','CARETAKER','Caretaker','caretaker','caretaker@college.edu','ACTIVE','$2b$10$4nL0JpYtvyc7Yg7xyaLlfuqm5glNG.MUv4L3EDEdz4gSyHj467hnG',false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8013','SUPERVISOR','Gate Supervisor','supervisor','supervisor@college.edu','ACTIVE','$2b$10$4Iq/rsU9M7Nj4MvbxuarPeBW63pKSCwgKWC2SyY7mITyDBycWXazO',false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8014','OPERATOR','Gate Operator (kiosk)','operator','operator@college.edu','ACTIVE','$2b$10$Yt9beBZFXczDHQJlXeCzVegqFKWScYOKNqHMEmS5YL3lSDmwk/nLC',false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8015','JOHN.DOE','John Doe (desk operator)','operator','john.doe@college.edu','ACTIVE','$2b$10$28WKrJx2HoY8LTd35ikoduXuqZs5d8uKc4AIRpAR8oDMvU4vyDV.m',false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8016','STUDENT','Demo Student','student','student@college.edu','ACTIVE','$2b$10$7t9FNgoKyWAdKL32s8p8YOZetggEROhvXUCP4Yrx7njOlvn5lUG1O',false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8017','GUARDIAN','Parent Guardian','guardian','guardian@college.edu','ACTIVE','$2b$10$LuwkI2HXWjIl3RWSe4La4uVKoIOXCoXeMZPR..J/asIS8JgwIUzne',false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8018','VISITOR','Demo Visitor','visitor','visitor@college.edu','ACTIVE','$2b$10$BJQZYHmRiLG5bnvWLNoDaeyiHqIoqf7e.QSwB5pGaEugP9/2kw62y',false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8019','WORKER','Demo Worker','worker','worker@college.edu','ACTIVE','$2b$10$Yc2qzwkNDRDs3AVtjOICA.2kL4EhEXSqAqgmLWHmB5OkccWjs.5XK',false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8002','VICE_PRINCIPAL','Vice Principal','vice_principal','viceprincipal@college.edu','ACTIVE','$2b$10$gFQBWH58UL4vCIoQoutNZurmspHX19VsxnbzkT3rHaj4a8.7ytRUi',false,true,0),
  ('b1eb29e3-7e71-48cb-a44c-6e0caa7f8020','ADMIN','Campus Admin','admin','admin@college.edu','ACTIVE','$2b$10$NQbN8JtOJTu8SxToCrHkBuhoFyImEETev771mmt7w7tXhyo2gzfve',false,true,0)
ON CONFLICT (email) DO UPDATE SET
  password_hash      = EXCLUDED.password_hash,
  role               = EXCLUDED.role,
  status             = EXCLUDED.status,
  password_must_change = TRUE,
  updated_at         = NOW();

-- ── PRINCIPAL + SYSADMIN: update the pre-existing rows in place ─────────────
-- The two emails already exist with different roles/unique_ids. We adopt the
-- existing rows: give them the user-specified password and the role the user
-- intends. (principal@college.edu: admin -> principal; sysadmin keeps role.)
UPDATE users
   SET unique_id          = 'PRINCIPAL',
       name               = 'Principal',
       role               = 'principal',
       password_hash      = '$2b$10$/it9BINWrWTnXC4ADwcmLOp.L53ruorJZpC.JDxx1.Nmj1Z.7pT5y',
       password_must_change = TRUE,
       status             = 'ACTIVE',
       updated_at         = NOW()
 WHERE email = 'principal@college.edu';

UPDATE users
   SET unique_id          = 'SYSADMIN',
       name               = 'System Admin',
       role               = 'sysadmin',
       password_hash      = '$2b$10$guADS5FG2f3Ya9iV74IS9e2IuJJy4LNk7AOhA9Z/DEjyIpjIsXvpW',
       password_must_change = TRUE,
       status             = 'ACTIVE',
       updated_at         = NOW()
 WHERE email = 'sysadmin@college.edu';

-- ── Kiosk default operator (exactly one) ────────────────────────────────────
UPDATE users SET is_kiosk_default = FALSE WHERE role = 'operator';
UPDATE users SET is_kiosk_default = TRUE  WHERE unique_id = 'OPERATOR' AND role = 'operator';

COMMIT;
