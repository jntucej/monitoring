-- 20261231000001_password_must_change.sql
--
-- Adds a `password_must_change` flag to users so that any password set by a
-- party other than the user (admin reset, enrollment-code bootstrap, seed
-- scripts, bulk import) forces the user to change it on their next login.
--
-- The flag is set by:
--   * admin/syadmin-driven password resets
--   * enrollment-code bootstrap (initial credential consumed)
--   * bulk import (enrollment code becomes the first password)
--   * create-first-sysadmin.sh / seed-21-roles.sql
--
-- It is cleared by:
--   * the user's own successful password change (change-password / reset-password)
--
-- No data backfill: all existing rows start with FALSE so the rollout does
-- not force a global password rotation.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_must_change BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.users.password_must_change IS
  'When TRUE the user must change their password on next login; set by admin resets, enrollment-code bootstrap, bulk import and seed scripts; cleared by a self-service password change.';
