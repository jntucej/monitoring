-- gate_app SELECT policy for permissions.
--
-- Same defect class as 20270101000005 / 20270101000006 / 20270101000008.
-- The existing permissions_gate_app_select policy gates rows on
-- current_setting('app.current_user_id') / 'app.current_role', but the
-- role-dashboards (principal / hod / vp) call query() WITHOUT threading
-- those GUCs, so the privileged-role branch never matches and gate_app
-- sees 0 of the permissions rows the dashboards aggregate (counts,
-- priorityItems, chainImpact, exams.pendingClearances, principalBridge)
-- -> the widgets silently zero-fill.
--
-- Verified: SET ROLE gate_app; SELECT count(*) FROM permissions WHERE
-- current_stage='principal' -> 0 (without GUCs) vs 6 (with GUCs / as
-- superuser).
--
-- The app enforces role-scoping in SQL (WHERE current_stage = ...), so a
-- permissive FOR SELECT TO gate_app USING(true) policy just un-hides the
-- table for the service role, mirroring the established gates /
-- movement_logs / alerts / delegation_rules / gate_passes pattern.
-- permissions already has GRANT SELECT to gate_app; only the SELECT
-- policy was missing (the existing one is GUC-gated and never fires on
-- the dashboard path).

DROP POLICY IF EXISTS permissions_gate_app_select_all ON public.permissions;
CREATE POLICY permissions_gate_app_select_all ON public.permissions
  FOR SELECT TO gate_app USING (true);
