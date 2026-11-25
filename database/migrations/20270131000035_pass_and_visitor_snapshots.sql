-- 20270131000035_pass_and_visitor_snapshots.sql
BEGIN;

ALTER TABLE public.gate_passes
  ADD COLUMN IF NOT EXISTS academic_snapshot jsonb;

ALTER TABLE public.visitor_logs
  ADD COLUMN IF NOT EXISTS academic_snapshot jsonb;

COMMIT;
