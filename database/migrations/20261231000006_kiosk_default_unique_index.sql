-- Migration: 20261231000006_kiosk_default_unique_index.sql
-- Enforces DB-level invariant that at most one user may hold is_kiosk_default = TRUE.
BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_one_kiosk_default
  ON public.users (is_kiosk_default)
  WHERE is_kiosk_default = TRUE;

COMMIT;
