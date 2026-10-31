-- gate_app SELECT policies for the 3 RLS-on, zero-policy tables the student
-- dashboard (and scan / occupancy / lookup paths) read. Without these, a
-- non-superuser gate_app session sees ZERO rows (RLS enabled + no policy),
-- so /api/student/dashboard returns lastScan:null, campus_occupancy reads
-- come back empty, and users lookups hide rows the app explicitly scopes
-- with WHERE user_id = $1. The app enforces owner-scoping in SQL; the
-- permissive policy just un-hides the table for the service role. This
-- mirrors the earlier gates_gate_app_select decision.
--
-- All three tables already have GRANT SELECT to gate_app; only the RLS
-- policies are missing.

DROP POLICY IF EXISTS movement_logs_gate_app_select ON public.movement_logs;
CREATE POLICY movement_logs_gate_app_select ON public.movement_logs
  FOR SELECT TO gate_app USING (true);

DROP POLICY IF EXISTS users_gate_app_select ON public.users;
CREATE POLICY users_gate_app_select ON public.users
  FOR SELECT TO gate_app USING (true);

DROP POLICY IF EXISTS campus_occupancy_gate_app_select ON public.campus_occupancy;
CREATE POLICY campus_occupancy_gate_app_select ON public.campus_occupancy
  FOR SELECT TO gate_app USING (true);
