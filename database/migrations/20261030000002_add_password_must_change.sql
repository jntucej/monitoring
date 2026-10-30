-- 20261030000002_add_password_must_change.sql
-- Add password_must_change flag to users table to enforce credential rotation on first login / reset.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_must_change BOOLEAN NOT NULL DEFAULT FALSE;
