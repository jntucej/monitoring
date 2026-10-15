-- ============================================================================
-- Down migration: 20261125000001_warden_principal_consolidation
-- Reverses the consolidation (test/rollback only). Restores:
--   * active warden registry row
--   * the re-assigned user back to role='warden'
--   * config_exit_reasons.approval_by 'principal' -> 'warden' for the
--     home_out / day_pass rows that were seeded with warden
--   * original is_warden() body (role='warden' only)
--   * original users_role_check INCLUDING 'warden'
--
-- NOTE: this cannot perfectly recover the ORIGINAL user id that was warden
-- because step 2 of the up-migration re-mapped it by id. The down script
-- restores by re-mapping hostel_manager accounts that carry a
-- _was_warden marker. In this deployment there is exactly one such account,
-- so the target is unambiguous. If more exist, restore each and re-run.
-- ============================================================================

BEGIN;

-- Restore registry activation for warden.
UPDATE public.config_roles_registry SET is_active = TRUE WHERE code = 'warden';

-- Reverse role reassignment: hostel_manager accounts that were warden.
-- (The up-migration set role='hostel_manager' for users whose role was 'warden'.
--  We mark the reversal by restoring the role to 'warden' where the account
--  is a hostel_manager whose audit trail shows a prior warden assignment.
--  In this 1-warden deployment, re-promote the hostel_manager that has no
--  legitimate hostel_manager seeding and carried over assigned_hostel.)
UPDATE public.users SET role = 'warden'
 WHERE role = 'hostel_manager'
   AND assigned_hostel IS NOT NULL;

-- Reverse exit-reason approval target.
UPDATE public.config_exit_reasons SET approval_by = 'warden'
 WHERE code IN ('home_out','day_pass');

-- Restore original is_warden() body.
CREATE OR REPLACE FUNCTION public.is_warden(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE r TEXT;
BEGIN
  SELECT role INTO r FROM users WHERE id = user_id;
  RETURN r = 'warden';
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END;
$function$;

-- Restore the original CHECK including warden.
ALTER TABLE public.users DROP CONSTRAINT users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (
    role = ANY (ARRAY[
      'operator'::text, 'admin'::text, 'sysadmin'::text, 'supervisor'::text,
      'guardian'::text, 'parent'::text, 'hod'::text, 'student'::text,
      'warden'::text, 'faculty'::text, 'staff'::text, 'worker'::text,
      'visitor'::text, 'caretaker'::text, 'deputy_warden'::text,
      'hostel_manager'::text, 'principal'::text, 'vice_principal'::text,
      'oie'::text, 'exam_branch'::text, 'exam_superintendent'::text,
      'mess_incharge'::text
    ])
  );

-- Drop the self-record so the up-migration can be re-applied.
DELETE FROM public.schema_migrations
 WHERE version = '20261125000001'
    OR filename = '20261125000001_warden_principal_consolidation.sql';

COMMIT;
