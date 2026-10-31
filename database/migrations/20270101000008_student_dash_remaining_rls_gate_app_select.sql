-- gate_app SELECT policies for the 3 remaining RLS-on tables the STUDENT
-- dashboard reads that were still missing gate_app SELECT policies.
-- Same defect class as 20270101000005 (student dashboard lastScan:null)
-- and 20270101000006 (role dash alerts/delegation_rules).
--
-- The live app pool connects as the non-superuser gate_app role. For any
-- RLS-enabled table with no matching gate_app policy, RLS hides every row
-- from gate_app -> the dashboard widget silently zero-fills (returns 200
-- but empty data).
--
-- Tables + dashboard widget:
--   gate_passes                    -> /api/student/dashboard activePasses
--   student_curfew_scores          -> /api/student/dashboard curfew
--   student_monthly_outing_summary -> /api/student/dashboard monthly
--
-- Permissive FOR SELECT TO gate_app USING(true) (mirrors the established
-- gates / movement_logs / users / campus_occupancy / alerts /
-- delegation_rules pattern). The app enforces owner-scoping in SQL
-- (WHERE user_id = $1 / student_user_id = $1); the policy just un-hides
-- the table for the service role. Both tables already have GRANT SELECT
-- to gate_app; only the RLS policies were missing.

DROP POLICY IF EXISTS gate_passes_gate_app_select ON public.gate_passes;
CREATE POLICY gate_passes_gate_app_select ON public.gate_passes
  FOR SELECT TO gate_app USING (true);

DROP POLICY IF EXISTS student_curfew_scores_gate_app_select ON public.student_curfew_scores;
CREATE POLICY student_curfew_scores_gate_app_select ON public.student_curfew_scores
  FOR SELECT TO gate_app USING (true);

DROP POLICY IF EXISTS student_monthly_outing_summary_gate_app_select ON public.student_monthly_outing_summary;
CREATE POLICY student_monthly_outing_summary_gate_app_select ON public.student_monthly_outing_summary
  FOR SELECT TO gate_app USING (true);
