-- 20270131000002_attendance_disputes_gate_app_rls.sql
-- Add gate_app RLS policy on public.attendance_disputes so the app role
-- can read and write attendance disputes (fixes silent-zero-row risk).

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.attendance_disputes') IS NOT NULL THEN
    DROP POLICY IF EXISTS attendance_disputes_gate_app_all ON public.attendance_disputes;
    CREATE POLICY attendance_disputes_gate_app_all
      ON public.attendance_disputes
      FOR ALL
      TO gate_app
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMIT;
