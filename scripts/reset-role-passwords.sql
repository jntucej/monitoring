-- WARNING: This script resets passwords to known values. Use ONLY on development databases.
-- Refuse to run if NODE_ENV=production.
--
-- The guard below checks the GUC `app.is_production` (set by the app or
-- docker-compose for the production Postgres instance). If the GUC is
-- present and 'true' the script raises an exception and aborts before any
-- UPDATE is executed. If the GUC is unset the guard is a no-op (dev mode).
DO $$ 
DECLARE
  v_prod TEXT;
BEGIN
  v_prod := current_setting('app.is_production', true);
  -- If unset or explicitly true, abort!
  IF v_prod IS NULL OR v_prod = 'true' THEN
    RAISE EXCEPTION 'CRITICAL: reset-role-passwords.sql aborted. app.is_production is not explicitly set to false!';
  END IF;
END $$;

-- Reset the unknown/rotated role account passwords to known values.
-- Run once from the postgres container. Verify each user's status before
-- assuming ACTIVE (STUDENT demo account is INACTIVE by design).
UPDATE users SET password_hash = crypt('operator123', gen_salt('bf', 10)) WHERE unique_id IN ('OPERATOR', 'JOHN.DOE');
UPDATE users SET password_hash = crypt('jntuhcej123', gen_salt('bf', 10)) WHERE unique_id = 'JNTUHCJ';
UPDATE users SET password_hash = crypt('Hod@123', gen_salt('bf', 10)) WHERE unique_id = 'HOD';
UPDATE users SET password_hash = crypt('HostelManager@123', gen_salt('bf', 10)) WHERE unique_id = 'HOSTEL_MANAGER';
UPDATE users SET password_hash = crypt('MessIncharge@123', gen_salt('bf', 10)) WHERE unique_id = 'MESS_INCHARGE';
UPDATE users SET password_hash = crypt('DeputyWarden@123', gen_salt('bf', 10)) WHERE unique_id = 'DEPUTY_WARDEN';
UPDATE users SET password_hash = crypt('VicePrincipal@123', gen_salt('bf', 10)) WHERE unique_id = 'VICE_PRINCIPAL';
SELECT unique_id, role, status FROM users WHERE unique_id IN
  ('OPERATOR','JOHN.DOE','JNTUHCJ','HOD','HOSTEL_MANAGER','MESS_INCHARGE','DEPUTY_WARDEN','VICE_PRINCIPAL')
ORDER BY unique_id;
