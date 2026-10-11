-- ============================================================================
-- Migration: Add created_by to enrollment_codes
-- Purpose: Track which admin issued each enrollment code (auditability).
--          The POST /api/admin/users/[id]/enrollment-code route inserts a
--          created_by column; the base schema predates it.
-- Idempotent: no-op when the column already exists.
-- ============================================================================

ALTER TABLE public.enrollment_codes
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
