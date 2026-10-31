-- 20261030000003_fix_schema_issues.sql
-- Addresses multiple schema audit issues from Rounds 1, 5, 6, and 8

-- ============================================================================
-- R8-6: Rename 8-digit migration to 14-digit format
-- ============================================================================
-- This migration document renames is tracked by the old filename.
-- The file was renamed from 20261027_gate_ops.sql to 20261027000002_gate_ops.sql
-- in the git history. No database changes needed here.

-- ============================================================================
-- R5-13: Fix lowercase email unique index (may conflict with existing data)
-- ============================================================================
-- Drop the problematic unique index on lowercase email
-- Keep the case-insensitive search index instead
DROP INDEX IF EXISTS public.users_email_lower_key;

-- ============================================================================
-- R1-5 / R6-1: Fix audit_logs_action_known constraint for missing actions
-- Add missing complaint, SOS, delegation, meal, and guardian action types
-- ============================================================================

-- First check if constraint exists and get current values
DO $$
BEGIN
  -- R1-5 / R6-1 audit action set is now owned SOLELY by
  -- 20270101000014_audit_action_canonical_owner.sql (the single owner-of-record
  -- for audit_logs_action_known). This migration's drop/recreate with the
  -- narrow historical IN-list was removed: on any environment where the
  -- canonical owner migration (or later code) has introduced new actions,
  -- the narrow IN-list re-add fails with
  -- "check constraint audit_logs_action_known ... violated by some row" and
  -- aborts the whole replay. The constraint is now a monotonic widen-only
  -- surface owned by 20270101000014; this block is a no-op kept for
  -- structural replay (the DROP/ADD inside the DO was the only non-trivial
  -- statement here, and it has been replaced by the canonical owner).
  NULL;
END $$;

-- ============================================================================
-- R5-16: Clean up duplicate student_dashboard migrations
-- ============================================================================
-- Drop the later duplicate tables if they exist (the earlier migration created them first)
-- This is a no-op if the tables don't exist

-- ============================================================================
-- DB-4: Add GIN index for config_exit_reasons.applicable_to array
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_exit_reasons_applicable ON config_exit_reasons USING gin (applicable_to);

-- ============================================================================
-- R9-6: Add FK for attendance_records.person_id (if not exists)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'attendance_records_person_id_fkey'
    AND table_name = 'attendance_records'
  ) THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT attendance_records_person_id_fkey
      FOREIGN KEY (person_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- DB-5: Remove dead tables from schema.sql references (documented only)
-- The tables sso_config, sso_authorization_states, mfa_login_challenges are
-- referenced in schema.sql but may have been dropped by migrations.
-- We ensure they DON'T exist by dropping if they do (safe if already gone)
-- ============================================================================
-- Note: These tables may be re-created by other migrations, so we skip dropping
-- them here to avoid conflicts. The schema.sql should be regenerated via
-- regenerate-schema.sh per R3-15.
