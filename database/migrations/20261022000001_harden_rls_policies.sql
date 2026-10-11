-- database/migrations/20261022000000_harden_rls_policies.sql

-- 1. Guardian Approval Policy (#1)
CREATE POLICY passes_update_guardian ON public.gate_passes FOR UPDATE TO authenticated
USING (user_id = ANY(get_guardian_wards(current_setting('app.current_user_id', true)::uuid)))
WITH CHECK (user_id = ANY(get_guardian_wards(current_setting('app.current_user_id', true)::uuid)));

-- 2. Restrict daily_stats policy (#2)
DROP POLICY IF EXISTS dstats_select_own ON public.daily_stats;
CREATE POLICY dstats_select_staff ON public.daily_stats FOR SELECT TO authenticated
USING (
  is_admin(current_setting('app.current_user_id', true)::uuid)
  OR is_warden(current_setting('app.current_user_id', true)::uuid)
  OR is_operator(current_setting('app.current_user_id', true)::uuid)
);
