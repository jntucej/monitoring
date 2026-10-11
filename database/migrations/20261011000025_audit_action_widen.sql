-- Widen action column and add known action constraint
ALTER TABLE public.audit_logs
  ALTER COLUMN action TYPE VARCHAR(100);

-- This migration is now a no-op for audit_logs_action_known.
-- The canonical allowlist is managed by 20261027000000_audit_action_canonical.sql
-- Kept as placeholder to preserve version ordering.