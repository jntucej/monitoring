-- Migration: 20261014000000_audit_tsv_and_actions.sql
-- Description: Add full-text search TSV column to audit_logs
-- Issues: #385, #403

BEGIN;

-- 1. Add full-text search TSV generated column and index for fast details search (Issue #403)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_logs'
      AND column_name = 'details_text_tsv'
  ) THEN
    ALTER TABLE public.audit_logs
      ADD COLUMN IF NOT EXISTS details_text_tsv tsvector
      GENERATED ALWAYS AS (to_tsvector('english', COALESCE(details::text, ''))) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_details_tsv
  ON public.audit_logs USING gin (details_text_tsv);

-- 2. audit_logs_action_known constraint is now managed by 20261027000000_audit_action_canonical.sql
-- This migration no longer modifies audit_logs_action_known (no-op)

COMMIT;
