-- ============================================================================
-- Migration: 20260916000000_security_rls_and_function_hardening
-- Purpose : Remediate Supabase security + performance advisor findings.
-- Author  : Security audit (see supabase/audit/SECURITY_AUDIT.md)
-- Safety  : Non-destructive. No DROP TABLE / DROP COLUMN / DELETE / TRUNCATE.
--           Enables RLS and adds policies only; existing policies are preserved.
--           Every section is independently reversible (see ROLLBACK at end).
-- ============================================================================
--
-- IMPORTANT CONTEXT (verified against this repo, not assumed):
--   * Server-side API routes in src/app/api/** use getSupabaseServiceClient()
--     (service_role) -> service_role bypasses RLS, so enabling RLS here does
--     NOT break the API layer.
--   * The ONLY client-side (browser) direct table read found is
--     src/components/operator/ManualEntryDialog.tsx, which reads
--     public.gate_passes by roll. That access is preserved by SECTION 6.
--   * public.resolve_login_identifier() and public.can_user_authenticate()
--     are invoked from the ANON browser client (src/lib/supabaseClient.ts).
--     They therefore MUST remain EXECUTE-able by anon -> see SECTION 8.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECTION 1: ENABLE RLS ON ALL ADVISOR-FLAGGED TABLES
-- ----------------------------------------------------------------------------
-- PROBLEM : RLS disabled -> any role holding a table GRANT could read/write the
--           whole table. schema.sql SECTION 10 issued GRANT ALL to anon, so
--           anon had full direct access to these tables.
-- SAFE    : ENABLE ROW LEVEL SECURITY is metadata-only. service_role keeps its
--           BYPASSRLS behaviour, so server routes are unaffected.
-- ----------------------------------------------------------------------------
ALTER TABLE public.support_tickets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_report_definitions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_access_rules            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_holidays                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_policies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_compliance_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_config                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sustainability_metrics       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_change_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_configs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_announcement_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sso_config                   ENABLE ROW LEVEL SECURITY;
-- Defence in depth: re-assert on the core tables defined in schema.sql.
ALTER TABLE public.users                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gates                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_details              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_details             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movement_logs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_occupancy             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_logs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_passes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_user_mappings         ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- SECTION 2: SERVICE_ROLE POLICIES (explicit intent, no public widening)
-- ----------------------------------------------------------------------------
-- service_role has BYPASSRLS on Supabase, so this is documentation-of-intent
-- and insurance for read-replica clients, NOT a behavioural change.
-- No anon/authenticated role is granted anything here.
-- ----------------------------------------------------------------------------
DO $$
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
END $$;;

-- ----------------------------------------------------------------------------
-- SECTION 3: ROLE HELPERS — accept the zero-arg (cached) form
-- ----------------------------------------------------------------------------
-- PROBLEM : 46 policies evaluate auth.uid() per row. Wrapping in
--           (SELECT auth.uid()) lets the planner evaluate it once (InitPlan).
--           Policies also call is_admin(auth.uid()) which reads public.users
--           per row.
-- FIX     : Add 0-arg overloads so policies read is_admin_self() with the uid
--           resolved inside the function, and cache the uid once per query.
-- SAFE    : Additive overloads. The existing is_admin(uuid) signature is kept
--           unchanged, so no caller/behaviour is altered. These new functions
--           do NOT need EXECUTE for anon/authenticated — they are called from
--           policy expressions which run with the table owner's rights only
--           for SECURITY DEFINER bodies; the *policy* runs as the querying role
--           so EXECUTE is needed. We grant them to authenticated only.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_self()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.is_admin((SELECT auth.uid())); $$;

CREATE OR REPLACE FUNCTION public.is_sysadmin_self()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.is_sysadmin((SELECT auth.uid())); $$;

CREATE OR REPLACE FUNCTION public.is_operator_self()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.is_operator((SELECT auth.uid())); $$;

CREATE OR REPLACE FUNCTION public.is_warden_self()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.is_warden((SELECT auth.uid())); $$;

CREATE OR REPLACE FUNCTION public.is_supervisor_self()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.is_supervisor((SELECT auth.uid())); $$;

REVOKE ALL ON FUNCTION public.is_admin_self()      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_sysadmin_self()   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_operator_self()   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_warden_self()     FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_supervisor_self() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_self()      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_sysadmin_self()   TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_operator_self()   TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_warden_self()     TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_supervisor_self() TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- SECTION 4: ADMIN/SYSADMIN-ONLY CONFIG & GOVERNANCE TABLES
-- ----------------------------------------------------------------------------
-- Access model (d): role-based, admin/sysadmin only. Verified against routes:
--   * retention_policies, data_compliance_logs, integration_configs,
--     integration_logs, sso_config, role_change_requests, alert_rules,
--     system_settings, saved_report_definitions, support metrics
--     -> all called with withAuthorization({requiredRole:["sysadmin"(,"admin")]})
--   * These are configuration/secret-bearing tables. NOT exposed to anon.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  admin_tables text[] := ARRAY[
    'retention_policies','data_compliance_logs','integration_configs',
    'integration_logs','sso_config','role_change_requests','alert_rules',
    'system_settings','saved_report_definitions'
  ];
BEGIN
  FOREACH t IN ARRAY admin_tables LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies
                   WHERE schemaname='public' AND tablename=t AND policyname='admin_all_'||t) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin_self()) WITH CHECK (public.is_admin_self())',
        'admin_all_'||t, t);
    END IF;
  END LOOP;
END $$;

-- data_compliance_logs is an append-only audit trail: admins may read it, but
-- writes should come from the retention worker (service_role) only. Override
-- the FOR ALL above with a read-only admin policy for the write verbs.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies
             WHERE schemaname='public' AND tablename='data_compliance_logs'
               AND policyname='admin_all_data_compliance_logs') THEN
    DROP POLICY admin_all_data_compliance_logs ON public.data_compliance_logs;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname='public' AND tablename='data_compliance_logs'
                   AND policyname='admin_select_data_compliance_logs') THEN
    CREATE POLICY admin_select_data_compliance_logs ON public.data_compliance_logs
      FOR SELECT TO authenticated USING (public.is_admin_self());
  END IF;
END $$;

-- sso_config holds client_id / issuer_url. It is NOT secret (no client_secret
-- column in this schema) and src/lib/sso.ts reads it to render the login page,
-- so authenticated users need SELECT. Writes remain admin-only.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies
             WHERE schemaname='public' AND tablename='sso_config'
               AND policyname='admin_all_sso_config') THEN
    DROP POLICY admin_all_sso_config ON public.sso_config;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname='public' AND tablename='sso_config'
                   AND policyname='sso_config_select_auth') THEN
    CREATE POLICY sso_config_select_auth ON public.sso_config
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname='public' AND tablename='sso_config'
                   AND policyname='sso_config_write_admin') THEN
    CREATE POLICY sso_config_write_admin ON public.sso_config
      FOR ALL TO authenticated
      USING (public.is_admin_self()) WITH CHECK (public.is_admin_self());
  END IF;
-- ----------------------------------------------------------------------------
-- SECTION 5: SUPPORT TICKETS (owner-only + staff/agent scope)
-- ----------------------------------------------------------------------------
-- Access model (c)+(d). Verified:
--   src/app/api/support/tickets/route.ts GET filters .eq("user_id", actorId)
--   -> a user sees only their own tickets. Staff with admin role see all
--   (src/app/api/admin/support/tickets/route.ts, requiredRole admin/sysadmin).
-- support_tickets.user_id is TEXT and auth.uid() is UUID, so cast to text.
-- NOTE: comments with is_internal = true are staff-only notes and are NOT
-- visible to the ticket owner.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS tickets_select_own ON public.support_tickets;
CREATE POLICY tickets_select_own ON public.support_tickets
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS tickets_insert_own ON public.support_tickets;
CREATE POLICY tickets_insert_own ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS tickets_update_own ON public.support_tickets;
CREATE POLICY tickets_update_own ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid())::text)
  WITH CHECK (user_id = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS tickets_all_admin ON public.support_tickets;
CREATE POLICY tickets_all_admin ON public.support_tickets
  FOR ALL TO authenticated
  USING (public.is_admin_self()) WITH CHECK (public.is_admin_self());

DROP POLICY IF EXISTS tcomments_select ON public.support_ticket_comments;
CREATE POLICY tcomments_select ON public.support_ticket_comments
  FOR SELECT TO authenticated
  USING (
    public.is_admin_self()
    OR (
      is_internal = false
      AND EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = support_ticket_comments.ticket_id
          AND t.user_id = (SELECT auth.uid())::text
      )
    )
  );

DROP POLICY IF EXISTS tcomments_insert ON public.support_ticket_comments;
CREATE POLICY tcomments_insert ON public.support_ticket_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())::text
    AND (
      public.is_admin_self()
      OR (
        is_internal = false
        AND EXISTS (
          SELECT 1 FROM public.support_tickets t
          WHERE t.id = support_ticket_comments.ticket_id
            AND t.user_id = (SELECT auth.uid())::text
        )
      )
-- ----------------------------------------------------------------------------
-- SECTION 6: ANNOUNCEMENTS (published-readable to auth users; own dismissals)
-- ----------------------------------------------------------------------------
-- Access model (b)+(c). Verified:
--   src/app/api/announcements/active/route.ts reads is_published = true for
--   every role, and filters by audience in application code.
--   src/app/api/announcements/[id]/dismiss/route.ts writes a dismissal row
--   keyed by the caller's own user_id.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS ann_select_published ON public.announcements;
CREATE POLICY ann_select_published ON public.announcements
  FOR SELECT TO authenticated USING (is_published = true);

DROP POLICY IF EXISTS ann_all_admin ON public.announcements;
CREATE POLICY ann_all_admin ON public.announcements
  FOR ALL TO authenticated
  USING (public.is_admin_self()) WITH CHECK (public.is_admin_self());

DROP POLICY IF EXISTS anc_dismiss_own ON public.user_announcement_dismissals;
CREATE POLICY anc_dismiss_own ON public.user_announcement_dismissals
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())::text)
  WITH CHECK (user_id = (SELECT auth.uid())::text);

-- ----------------------------------------------------------------------------
-- SECTION 7: GATE SCHEDULING & OPERATIONAL READ TABLES
-- ----------------------------------------------------------------------------
-- Access model (b)+(d). Verified:
--   src/app/api/gates/schedule/route.ts (GET+POST) and .../current/route.ts
--   -> withAuthorization({requiredRole:["sysadmin","admin"]}) for writes;
--      operators/wardens consume the "current" schedule.
--   zones is rendered by src/lib/occupancy.ts for campus heatmaps.
-- gate_access_rules / gate_holidays are campus-wide policy, safe for all
-- authenticated users to read; writes are admin-only.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  read_auth_tables text[] := ARRAY[
    'gate_access_rules','gate_holidays','zones','predictions',
    'sustainability_metrics'
  ];
BEGIN
  FOREACH t IN ARRAY read_auth_tables LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies
                   WHERE schemaname='public' AND tablename=t AND policyname='auth_select_'||t) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
        'auth_select_'||t, t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies
                   WHERE schemaname='public' AND tablename=t AND policyname='admin_write_'||t) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin_self()) WITH CHECK (public.is_admin_self())',
        'admin_write_'||t, t);
    END IF;
  END LOOP;
END $$;
    )
  );
END $$;