-- ============================================================================
-- Migration: 20270116000003_movement_scan_category
-- Purpose: Add an editable scan category + audit trail for the operator
--          ScanDetailModal "edit scan category with reason" feature.
-- ============================================================================

BEGIN;

-- Category column (replaces free-text reason for the editable field)
ALTER TABLE public.movement_logs
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Edit trail (one row per correction, kept for audit)
CREATE TABLE IF NOT EXISTS public.scan_corrections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id        UUID NOT NULL REFERENCES public.movement_logs(id) ON DELETE CASCADE,
  category      TEXT NOT NULL,
  reason        TEXT NOT NULL,
  corrected_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  corrected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id)
);

CREATE INDEX IF NOT EXISTS idx_scan_corrections_log
  ON public.scan_corrections(log_id, corrected_at DESC);

COMMIT;
