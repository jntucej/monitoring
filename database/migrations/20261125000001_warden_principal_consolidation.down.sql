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
-- NOTE: this recovers the user that was warden by anchoring on the
-- audit_logs ROLE_CHANGED trail (old_role='warden',
-- new_role='hostel_manager') written by the up-migration's reassignment.
-- In this deployment exactly one such account exists, so the target is
-- unambiguous; on a fresh DB (no audit trail) the reversal is a no-op.
-- If more exist, each is restored.
-- ============================================================================

BEGIN;

-- Restore registry activation for warden.
UPDATE public.config_roles_registry SET is_active = TRUE WHERE code = 'warden';

-- Reverse role reassignment: hostel_manager accounts that were warden.
-- (The up-migration set role='hostel_manager' for users whose role was 'warden'.
--  Those accounts are identified by the audit_logs trail: the role-change
--  trigger (create_audit_log_on_user_change) records action 'ROLE_CHANGED'
--  with details {user_id, old_role, new_role}. In this 1-warden deployment
--  exactly one such row exists. If none exist (fresh DB, or no audit trail),
--  this is a no-op.)
UPDATE public.users u
   SET role = 'warden'
  FROM public.audit_logs a
 WHERE a.action = 'ROLE_CHANGED'
   AND a.details->>'old_role' = 'warden'
   AND a.details->>'new_role' = 'hostel_manager'
   AND (a.details->>'user_id')::uuid = u.id
   AND u.role = 'hostel_manager';

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
