-- ============================================================================
-- Migration: 20270116000002_attendance_disputes
-- Purpose: Add attendance_disputes table for student dispute workflow.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.attendance_disputes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  reason        TEXT NOT NULL,
  evidence      TEXT,
  status        TEXT NOT NULL DEFAULT 'OPEN'
                CHECK (status IN ('OPEN','IN_REVIEW','RESOLVED','DISMISSED')),
  resolution    TEXT,
  resolved_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (person_id, date, status)
);

CREATE INDEX IF NOT EXISTS idx_attendance_disputes_person_status
  ON public.attendance_disputes(person_id, status, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_disputes_status
  ON public.attendance_disputes(status, created_at DESC);

  -- Reusable audit log function (idempotent)
CREATE OR REPLACE FUNCTION public.handle_attendance_disputes_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendance_disputes_updated ON public.attendance_disputes;
CREATE TRIGGER trg_attendance_disputes_updated
  BEFORE UPDATE ON public.attendance_disputes
  FOR EACH ROW EXECUTE FUNCTION public.handle_attendance_disputes_updated();

-- RLS
ALTER TABLE public.attendance_disputes ENABLE ROW LEVEL SECURITY;

-- Students: read/write own disputes
CREATE POLICY attendance_disputes_student_own ON public.attendance_disputes
  FOR ALL TO authenticated
  USING (person_id = auth.uid())
  WITH CHECK (person_id = auth.uid());

-- Admin/sysadmin: read all, update resolution
CREATE POLICY attendance_disputes_admin ON public.attendance_disputes
  FOR ALL TO authenticated
  USING (is_admin_self())
  WITH CHECK (is_admin_self());

COMMIT;
