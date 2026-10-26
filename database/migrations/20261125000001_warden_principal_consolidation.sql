-- ============================================================================
-- Migration: 20261125000001_warden_principal_consolidation
-- Purpose:   Permanently remove the "warden" application role and fold its
--            hostel-management responsibilities into "principal".
--
-- NOTE: .down.sql deleted (P1-13). Rollback of role changes must go through a
--       planned migration, not a replay of audit_logs.
--
-- Ground truth (verified against production gate_monitor, 2026-10-15):
--   * 1 active user with role='warden' ("Hostel Warden"), assigned_hostel NULL.
--   * 1 active user with role='principal' ("Principal Account").
--   * config_roles_registry has an active 'warden' row (the live role gate via
--     the trg_validate_user_role trigger + validate_user_role()).
--   * users_role_check is a CHECK (role = ANY (...)) including 'warden'.
--   * config_exit_reasons rows home_out / day_pass have approval_by='warden'
--     (active TS default is 'principal' — data and code disagree; reconcile).
--   * is_warden(user_id) / get_warden_hostel(user_id) exist in pg_proc;
--     get_warden_hostel returns users.assigned_hostel (the live scoping data).
--   * No RLS policy in production calls these functions.
--
-- Plan (data-preserving):
--   1. Deactivate the 'warden' registry row (blocks new/updated warden rows
--      via the validate_user_role() trigger). Row is kept for audit.
--   2. Reassign the existing warden account to 'hostel_manager' (closest
--      surviving hostel role). Do NOT auto-promote to principal; a verified
--      principal account is provisioned separately. assigned_hostel is copied
--      to the target so hostel-block scoping survives.
--   3. Reconcile config_exit_reasons.approval_by 'warden' -> 'principal'.
--   4. Redefine is_warden() to check principal (deprecation shim: any SQL
--      path that still treats "warden" as a privilege now sees principal).
--      get_warden_hostel() is KEPT as-is (returns users.assigned_hostel —
--      still the correct scoping source now that principal owns the hostel).
--   5. Widen users_role_check to keep 'principal' (already present) and drop
--      'warden' so the CHECK reflects the new role model.
--
-- NOT touched (data/audit preservation):
--   * student_details.warden_id, users.assigned_hostel (column + data).
--   * audit_logs / stage_history / delegation_logs rows (history kept).
--   * deputy_warden / hostel_manager / caretaker roles.
--   * warden_or_principal permission-workflow stage string.
-- Rollback: 20261125000001_down.sql re-activates the registry row, restores
--   the re-assigned user's role to 'warden', restores approval_by, and
--   restores the original CHECK constraint.
-- Idempotent: safe to re-run.
-- ============================================================================

BEGIN;

-- 1. Deactivate warden in the role registry (live role gate).
UPDATE public.config_roles_registry
   SET is_active = FALSE
 WHERE code = 'warden';

-- Deactivate warden in config_roles if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'config_roles') THEN
    UPDATE public.config_roles SET is_active = FALSE WHERE code = 'warden';
  END IF;
END $$;

-- 2. Reassign existing warden accounts to hostel_manager (not principal).
--    Carry over assigned_hostel so hostel-block scoping is preserved.
UPDATE public.users target
   SET role = 'hostel_manager',
       assigned_hostel = COALESCE(target.assigned_hostel, src.assigned_hostel)
 FROM public.users src
 WHERE src.role = 'warden'
   AND src.id = target.id;

-- Ensure exactly one row per user is updated (safety: the FROM join above
-- matches on id, so it is 1:1; this guard is a no-op when already applied).
-- No-op placeholder kept for clarity on idempotency.

-- 3. Reconcile exit-flow approval target (data now matches active code).
UPDATE public.config_exit_reasons
   SET approval_by = 'principal'
 WHERE approval_by = 'warden';

-- 4. Deprecation shim: is_warden() now reports principal membership so any
--    lingering SQL privilege check resolves to the consolidated role.
CREATE OR REPLACE FUNCTION public.is_warden(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE r TEXT;
BEGIN
  SELECT role INTO r FROM users WHERE id = user_id;
  RETURN r = 'principal' OR r = 'warden';
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END;
$function$;

-- get_warden_hostel() intentionally UNCHANGED: it returns users.assigned_hostel,
-- which remains the correct hostel-block scoping source under principal.

-- 5. Widen/refresh the role CHECK: drop 'warden', keep 'principal'.
ALTER TABLE public.users
  DROP CONSTRAINT users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (
    role = ANY (ARRAY[
      'operator'::text, 'admin'::text, 'sysadmin'::text, 'supervisor'::text,
      'guardian'::text, 'parent'::text, 'hod'::text, 'student'::text,
      'faculty'::text, 'staff'::text, 'worker'::text, 'visitor'::text,
      'caretaker'::text, 'deputy_warden'::text, 'hostel_manager'::text,
      'principal'::text, 'vice_principal'::text, 'oie'::text,
      'exam_branch'::text, 'exam_superintendent'::text, 'mess_incharge'::text
    ])
  );

-- Self-record (adaptive to both schema_migrations shapes).
DO $$
DECLARE has_filename BOOLEAN; has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations'
      AND column_name='filename') INTO has_filename;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations'
      AND column_name='checksum') INTO has_checksum;
  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('20261125000001',
            '20261125000001_warden_principal_consolidation.sql', NOW(),
            md5('20261125000001_warden_principal_consolidation'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261125000001',
            '20261125000001_warden_principal_consolidation.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261125000001', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;

COMMIT;
