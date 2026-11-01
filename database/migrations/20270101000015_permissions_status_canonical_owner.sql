-- 20270101000015_permissions_status_canonical_owner.sql
-- Single, monotonic, owner-of-record for the permissions.status CHECK constraint.
--
-- Background: the permissions_status_check constraint was created and re-created
-- across 4+ migrations (20261009000000 seeds the initial 6-value set,
-- 20261026000002 adds EXPIRED + DISPUTED, 20261116000000 drop+re-adds all 8,
-- 20270101000000 drop+re-adds all 8 'in case'). Multiple owners of one
-- constraint make it impossible to tell which migration is authoritative,
-- and any future value added by a new migration can silently be missed.
--
-- This migration is the single canonical owner: it drops and re-adds
-- permissions_status_check with the full 8-value set. It is idempotent
-- (DROP IF EXISTS + ADD, guarded by to_regclass) so re-replay is safe.
--
-- Older migrations that created/re-created this constraint remain in the
-- replay history and replay harmlessly — they all use DROP IF EXISTS + ADD,
-- so they do not conflict with this owner. After this migration, any new
-- status value MUST be added here (append to the CHECK list in this file),
-- never in a separate migration.

DO $$
BEGIN
  IF to_regclass('public.permissions') IS NOT NULL THEN
    ALTER TABLE public.permissions DROP CONSTRAINT IF EXISTS permissions_status_check;
    ALTER TABLE public.permissions ADD CONSTRAINT permissions_status_check
      CHECK (status IN ('PENDING','APPROVED','REJECTED','ESCALATED','COMPLETED','CANCELLED','EXPIRED','DISPUTED'));
  END IF;
END $$;
