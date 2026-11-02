-- ============================================================================
-- 20270102000003_gate_app_write_set_owner.sql
--
-- Single, monotonic, owner-of-record for the gate_app WRITE set.
--
-- Background: 20261231000005 enforced NOBYPASSRLS on gate_app and
-- 20261231000014 revoked service_role inheritance, so the `FOR ALL
-- TO service_role USING (true)` policies no longer apply to the app.
-- 20270101000013 fixed SELECT (80 tables). This migration does the same
-- for the write set — every RLS-enabled table the app INSERT/UPDATE/DELETEs.
--
-- Model: PERMISSIVE (USING (true) / WITH CHECK (true)), matching the
-- read-set pattern. Authorization is enforced at the app layer (each
-- route checks auth.role / auth.userId before calling). GUC-scoped
-- policies (app.current_role) exist on a few tables (permissions,
-- enrollment_codes, user_roles) and are more specific; this migration
-- adds a permissive base so the remaining 87 tables stop silently
-- returning 0 rows.
--
-- Idempotent: DROP POLICY IF EXISTS + CREATE, guarded by to_regclass.
-- ============================================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'achievement_definitions',
    'alert_rules',
    'alerts',
    'announcement_follows',
    'announcements',
    'api_metrics',
    'backups',
    'bot_conversations',
    'bot_messages',
    'bot_retrieval_log',
    'calendar_categories',
    'calendar_follows',
    'campus_events',
    'campus_feedback_reports',
    'campus_knowledge_docs',
    'campus_occupancy',
    'communities',
    'community_memberships',
    'community_posts',
    'community_reports',
    'complaint_attachments',
    'complaint_calls',
    'complaint_cctv_refs',
    'complaint_tasks',
    'complaint_viewers',
    'complaints',
    'daily_stats',
    'data_compliance_logs',
    'delegation_logs',
    'delegation_rules',
    'deployments',
    'developer_messages',
    'emergency_alerts',
    'employee_details',
    'event_registrations',
    'gate_access_rules',
    'gate_holidays',
    'gate_passes',
    'gates',
    'guardian_links',
    'integration_configs',
    'integration_logs',
    'kb_chunks',
    'kb_documents',
    'lms_config',
    'meal_opt_outs',
    'mess_days',
    'mess_day_items',
    'mess_menu_items',
    'mess_event_tokens',
    'mess_meal_reviews',
    'mess_special_events',
    'mess_special_interests',
    'mess_special_items',
    'mobile_enrollment_codes',
    'movement_logs',
    'mtech_specializations',
    'notification_email_queue',
    'notification_preferences',
    'notification_push_queue',
    'notification_sms_queue',
    'notifications',
    'onboarding_progress',
    'password_reset_tokens',
    'personal_goals',
    'pin_login_attempts',
    'predictions',
    'retention_policies',
    'role_change_requests',
    'saved_report_definitions',
    'scan_nonces',
    'security_alerts',
    'shift_handovers',
    'shifts',
    'student_curfew_scores',
    'student_details',
    'student_monthly_outing_summary',
    'student_representatives',
    'support_ticket_comments',
    'support_tickets',
    'sustainability_metrics',
    'system_alerts',
    'system_settings',
    'user_achievements',
    'user_announcement_dismissals',
    'user_saved_views',
    'user_task_drafts',
    'users',
    'visitor_logs',
    'zones'

  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_gate_app_write', t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO gate_app USING (true) WITH CHECK (true)',
        t || '_gate_app_write', t
      );
    END IF;
  END LOOP;
END $$;
