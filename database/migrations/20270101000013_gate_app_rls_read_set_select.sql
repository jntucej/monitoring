-- 20270101000013_gate_app_rls_read_set_select.sql
-- Single, monotonic, owner-of-record for the gate_app RLS read set.
--
-- Background: RLS is enabled on the tables below and gate_app is NOBYPASSRLS,
-- but only a subset of tables had a `FOR SELECT TO gate_app` policy. For any RLS
-- table WITHOUT a gate_app SELECT policy, the app role sees ZERO rows and the
-- API returns HTTP 200 with an empty result set — silent data loss. This
-- migration adds the missing SELECT policies for the full gate_app read set.
-- Each policy is additive and idempotent (DROP POLICY IF EXISTS + CREATE, guarded
-- by to_regclass), so re-replay is safe and it never regresses a table that
-- already carries its own gate_app policy.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['achievement_definitions', 'alert_rules', 'announcement_follows', 'announcements', 'anti_ragging_cases', 'backups', 'bot_conversations', 'bot_messages', 'bot_retrieval_log', 'calendar_categories', 'calendar_follows', 'campus_events', 'campus_feedback_reports', 'campus_knowledge_docs', 'communities', 'community_memberships', 'community_posts', 'community_reports', 'complaint_attachments', 'complaint_calls', 'complaint_cctv_refs', 'complaint_tasks', 'complaint_viewers', 'complaints', 'daily_stats', 'data_compliance_logs', 'deployments', 'developer_messages', 'emergency_alerts', 'employee_details', 'event_registrations', 'gate_access_rules', 'gate_holidays', 'guardian_links', 'integration_configs', 'integration_logs', 'kb_chunks', 'kb_documents', 'lms_config', 'mess_event_tokens', 'mess_meal_reviews', 'mess_special_events', 'mess_special_interests', 'mess_special_items', 'mobile_enrollment_codes', 'notification_email_queue', 'notification_preferences', 'notification_push_queue', 'notification_sms_queue', 'notifications', 'onboarding_progress', 'password_reset_tokens', 'personal_goals', 'pin_login_attempts', 'predictions', 'retention_policies', 'role_change_requests', 'saved_report_definitions', 'scan_nonces', 'shift_handovers', 'student_details', 'student_representatives', 'support_ticket_comments', 'support_tickets', 'sustainability_metrics', 'system_alerts', 'system_settings', 'user_achievements', 'user_announcement_dismissals', 'user_saved_views', 'user_task_drafts', 'visitor_logs', 'zones']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_gate_app_select', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO gate_app USING (true)', t || '_gate_app_select', t);
    END IF;
  END LOOP;
END $$;
