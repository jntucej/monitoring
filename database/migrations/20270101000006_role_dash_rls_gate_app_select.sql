-- gate_app SELECT policies for the 2 remaining RLS-on, zero-policy tables
-- that the principal dashboard reads. Same defect class as
-- 20270101000005 (student dashboard): a non-superuser gate_app session
-- sees ZERO rows on any RLS-enabled table with no matching policy, so the
-- principal dashboard's "recentAlerts" and "delegations" widgets were
-- silently zero-filled (returned 200 but empty).
--
-- alerts            -> /api/principal/dashboard recentAlerts
-- delegation_rules  -> /api/principal/dashboard delegations
--
-- Permissive FOR SELECT TO gate_app USING(true) (mirrors the earlier
-- gates / movement_logs / users / campus_occupancy policies). The app
-- enforces owner/role scoping in SQL; the policy just un-hides the
-- table for the service role. Both tables already have GRANT SELECT to
-- gate_app; only the RLS policies were missing.

DROP POLICY IF EXISTS alerts_gate_app_select ON public.alerts;
CREATE POLICY alerts_gate_app_select ON public.alerts
  FOR SELECT TO gate_app USING (true);

DROP POLICY IF EXISTS delegation_rules_gate_app_select ON public.delegation_rules;
CREATE POLICY delegation_rules_gate_app_select ON public.delegation_rules
  FOR SELECT TO gate_app USING (true);
