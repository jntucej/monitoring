-- ============================================================================
-- Migration: 20260916000000_security_rls_and_function_hardening
-- Purpose Remediate Supabase security performance advisor findings.
-- Author Security audit (see supabase/audit/SECURITY_AUDIT.md)
-- Safety Non-destructive. DROP TABLE / DROP COLUMN / DELETE / TRUNCATE.
-- Enables RLS adds policies only; existing policies preserved.
-- Every section independently reversible (see ROLLBACK at end).
-- ============================================================================

-- IMPORTANT CONTEXT (verified against this repo, not assumed)
-- Server-side API routes src/app/api/** use getSupabaseServiceClient()
-- (service_role) service_role bypasses RLS, enabling RLS NOT break API layer.
-- ONLY client-side (browser) direct table read found
-- src/components/operator/ManualEntryDialog.tsx, which reads
-- public.gate_passes roll. access preserved SECTION 6.
-- public.resolve_login_identifier() public.can_user_authenticate()
-- invoked ANON browser client (src/lib/supabaseClient.ts).
-- therefore MUST remain EXECUTE-able anon see SECTION 8.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECTION 1: ENABLE RLS ALL ADVISOR-FLAGGED TABLES
-- ----------------------------------------------------------------------------
-- PROBLEM RLS disabled any role holding table GRANT read/write whole table.
-- schema.sql SECTION 10 issued GRANT ALL anon, ...

-- ----------------------------------------------------------------------------
-- SECTION 2: CREATE POLICIES FOR SERVICE_ROLE
-- ----------------------------------------------------------------------------

DO$$
DECLARE
  t text;
  pol_name text;
  service_tables text[] := ARRAY[
    'support_tickets','support_ticket_comments','saved_report_definitions',
    'gate_access_rules','gate_holidays','retention_policies',
    'data_compliance_logs','zones','lms_config','sustainability_metrics',
    'alert_rules','system_settings','onboarding_progress','predictions',
    'role_change_requests','integration_configs','integration_logs',
    'announcements','user_announcement_dismissals','sso_config',
    'device_user_mappings'
  ];
BEGIN
  FOREACH t IN ARRAY service_tables LOOP
    pol_name := 'svc_all_' || t;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND policyname = pol_name
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        pol_name, t
      );
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- SECTION 3: ROLE HELPERS accept zero-arg (cached) form
-- ----------------------------------------------------------------------------
-- PROBLEM 46 policies evaluate auth.uid() per row. Wrapping in
-- (SELECT auth.uid()) lets planner evaluate once (InitPlan).
-- Policies call is_admin(auth.uid()) which reads public.users
-- per row.
-- FIX Add 0-arg overloads policies read is_admin_self() uid
-- resolved inside function, cache uid once per query.

CREATE OR REPLACE FUNCTION public.is_admin_self()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$SELECT public.is_admin((SELECT auth.uid()))$function$;

-- ----------------------------------------------------------------------------
-- SECTION 4: AUTHENTICATED POLICIES WITH CACHED HELPERS
-- ----------------------------------------------------------------------------

DO$$
DECLARE
  t text;
  pol_name text;
  auth_tables text[] := ARRAY[
    'support_tickets','support_ticket_comments','saved_report_definitions',
    'gate_access_rules','gate_holidays','retention_policies',
    'data_compliance_logs','zones','lms_config','sustainability_metrics',
    'alert_rules','system_settings','onboarding_progress','predictions',
    'role_change_requests','integration_configs','integration_logs',
    'announcements','user_announcement_dismissals','sso_config',
    'device_user_mappings','gate_passes','predictions'
  ];
BEGIN
  FOREACH t IN ARRAY auth_tables LOOP
    pol_name := 'auth_all_' || t;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND policyname = pol_name
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin_self()) WITH CHECK (public.is_admin_self())',
        pol_name, t
      );
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- SECTION 5: ADMIN POLICIES FOR READ-ONLY ACCESS
-- ----------------------------------------------------------------------------
-- admin_read_* policies let admin read audit/logging tables
-- append-only audit trail: admins read it, NOT behavioural change.
-- anon/authenticated role granted anything here.

DO$$
DECLARE
  t text;
  pol_name text;
  admin_tables text[] := ARRAY[
    'data_compliance_logs','zones','lms_config','sustainability_metrics',
    'alert_rules','system_settings','onboarding_progress','predictions',
    'role_change_requests','integration_configs','integration_logs',
    'announcements','user_announcement_dismissals','sso_config'
  ];
BEGIN
  FOREACH t IN ARRAY admin_tables LOOP
    pol_name := 'admin_read_' || t;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND policyname = pol_name
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO admin USING (public.is_admin_self())',
        pol_name, t
      );
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- SECTION 6: PROTECTED TABLES READ BY OPERATOR DIALOG
-- ----------------------------------------------------------------------------
-- ONLY client-side (browser) direct table read found
-- src/components/operator/ManualEntryDialog.tsx, which reads
-- public.gate_passes roll. access preserved.

DO$$
DECLARE
  t text;
  pol_name text;
BEGIN
  pol_name := 'operator_read_gate_passes';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gate_passes' AND policyname = pol_name
  ) THEN
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      pol_name, 'gate_passes'
    );
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- SECTION 7: EXECUTE PRIVILEGES FOR SECURITY FUNCTIONS
-- ----------------------------------------------------------------------------
-- public.resolve_login_identifier() public.can_user_authenticate()
-- invoked ANON browser client (src/lib/supabaseClient.ts).
-- therefore MUST remain EXECUTE-able anon.

GRANT EXECUTE ON FUNCTION public.resolve_login_identifier() TO anon;
GRANT EXECUTE ON FUNCTION public.can_user_authenticate() TO anon;

-- ----------------------------------------------------------------------------
-- SECTION 8: FUNCTIONS FOR GOVERNING RLS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin(p_uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
SELECT EXISTS (
  SELECT 1 FROM public.users
  WHERE id = p_uid AND role IN ('admin', 'super_admin')
)
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_check(p_uid uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT public.is_admin(p_uid) THEN
    RAISE EXCEPTION 'admin only';
  END IF;
END
$function$;

-- ----------------------------------------------------------------------------
-- ROLLBACK ALL CHANGES (for testing/reverting)
-- ----------------------------------------------------------------------------

-- DROP FUNCTION IF EXISTS public.is_admin_self();
-- DROP FUNCTION IF EXISTS public.is_admin(uuid);
-- DROP FUNCTION IF EXISTS public.is_admin_check(uuid);
-- DROP POLICY IF EXISTS admin_read_data_compliance_logs ON public.data_compliance_logs;
-- DROP POLICY IF EXISTS admin_read_zones ON public.zones;
-- DROP POLICY IF EXISTS admin_read_lms_config ON public.lms_config;
-- DROP POLICY IF EXISTS admin_read_sustainability_metrics ON public.sustainability_metrics;
-- DROP POLICY IF EXISTS admin_read_alert_rules ON public.alert_rules;
-- DROP POLICY IF EXISTS admin_read_system_settings ON public.system_settings;
-- DROP POLICY IF EXISTS admin_read_onboarding_progress ON public.onboarding_progress;
-- DROP POLICY IF EXISTS admin_read_predictions ON public.predictions;
-- DROP POLICY IF EXISTS admin_read_role_change_requests ON public.role_change_requests;
-- DROP POLICY IF EXISTS admin_read_integration_configs ON public.integration_configs;
-- DROP POLICY IF EXISTS admin_read_integration_logs ON public.integration_logs;
-- DROP POLICY IF EXISTS admin_read_announcements ON public.announcements;
-- DROP POLICY IF EXISTS admin_read_user_announcement_dismissals ON public.user_announcement_dismissals;
-- DROP POLICY IF EXISTS admin_read_sso_config ON public.sso_config;
-- DROP POLICY IF EXISTS operator_read_gate_passes ON public.gate_passes;
-- DROP POLICY IF EXISTS auth_all_support_tickets ON public.support_tickets;
-- DROP POLICY IF EXISTS auth_all_support_ticket_comments ON public.support_ticket_comments;
-- DROP POLICY IF EXISTS auth_all_saved_report_definitions ON public.saved_report_definitions;
-- DROP POLICY IF EXISTS auth_all_gate_access_rules ON public.gate_access_rules;
-- DROP POLICY IF EXISTS auth_all_gate_holidays ON public.gate_holidays;
-- DROP POLICY IF EXISTS auth_all_retention_policies ON public.retention_policies;
-- DROP POLICY IF EXISTS auth_all_data_compliance_logs ON public.data_compliance_logs;
-- DROP POLICY IF EXISTS auth_all_zones ON public.zones;
-- DROP POLICY IF EXISTS auth_all_lms_config ON public.lms_config;
-- DROP POLICY IF EXISTS auth_all_sustainability_metrics ON public.sustainability_metrics;
-- DROP POLICY IF EXISTS auth_all_alert_rules ON public.alert_rules;
-- DROP POLICY IF EXISTS auth_all_system_settings ON public.system_settings;
-- DROP POLICY IF EXISTS auth_all_onboarding_progress ON public.onboarding_progress;
-- DROP POLICY IF EXISTS auth_all_predictions ON public.predictions;
-- DROP POLICY IF EXISTS auth_all_role_change_requests ON public.role_change_requests;
-- DROP POLICY IF EXISTS auth_all_integration_configs ON public.integration_configs;
-- DROP POLICY IF EXISTS auth_all_integration_logs ON public.integration_logs;
-- DROP POLICY IF EXISTS auth_all_announcements ON public.announcements;
-- DROP POLICY IF EXISTS auth_all_user_announcement_dismissals ON public.user_announcement_dismissals;
-- DROP POLICY IF EXISTS auth_all_sso_config ON public.sso_config;
-- DROP POLICY IF EXISTS auth_all_device_user_mappings ON public.device_user_mappings;
-- DROP POLICY IF EXISTS auth_all_gate_passes ON public.gate_passes;
-- DROP POLICY IF EXISTS svc_all_support_tickets ON public.support_tickets;
-- DROP POLICY IF EXISTS svc_all_support_ticket_comments ON public.support_ticket_comments;
-- DROP POLICY IF EXISTS svc_all_saved_report_definitions ON public.saved_report_definitions;
-- DROP POLICY IF EXISTS svc_all_gate_access_rules ON public.gate_access_rules;
-- DROP POLICY IF EXISTS svc_all_gate_holidays ON public.gate_holidays;
-- DROP POLICY IF EXISTS svc_all_retention_policies ON public.retention_policies;
-- DROP POLICY IF EXISTS svc_all_data_compliance_logs ON public.data_compliance_logs;
-- DROP POLICY IF EXISTS svc_all_zones ON public.zones;
-- DROP POLICY IF EXISTS svc_all_lms_config ON public.lms_config;
-- DROP POLICY IF EXISTS svc_all_sustainability_metrics ON public.sustainability_metrics;
-- DROP POLICY IF EXISTS svc_all_alert_rules ON public.alert_rules;
-- DROP POLICY IF EXISTS svc_all_system_settings ON public.system_settings;
-- DROP POLICY IF EXISTS svc_all_onboarding_progress ON public.onboarding_progress;
-- DROP POLICY IF EXISTS svc_all_predictions ON public.predictions;
-- DROP POLICY IF EXISTS svc_all_role_change_requests ON public.role_change_requests;
-- DROP POLICY IF EXISTS svc_all_integration_configs ON public.integration_configs;
-- DROP POLICY IF EXISTS svc_all_integration_logs ON public.integration_logs;
-- DROP POLICY IF EXISTS svc_all_announcements ON public.announcements;
-- DROP POLICY IF EXISTS svc_all_user_announcement_dismissals ON public.user_announcement_dismissals;
-- DROP POLICY IF EXISTS svc_all_sso_config ON public.sso_config;
-- DROP POLICY IF EXISTS svc_all_device_user_mappings ON public.device_user_mappings;
-- DROP POLICY IF EXISTS svc_all_gate_passes ON public.gate_passes;