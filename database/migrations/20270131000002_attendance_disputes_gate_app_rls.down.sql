-- Rollback 20270131000002_attendance_disputes_gate_app_rls.sql
BEGIN;
DROP POLICY IF EXISTS attendance_disputes_gate_app_all ON public.attendance_disputes;
COMMIT;
