-- ═══════════════════════════════════════════════════════════════════════════
-- Privacy RLS Hardening — Round 1
-- ═══════════════════════════════════════════════════════════════════════════
-- Fixes confirmed live bugs where owner-scoped policies used
-- `USING (true)` or `USING (... OR true)` — which always evaluate to TRUE,
-- meaning ANY authenticated user could read ANY other user's private data.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. personal_goals ─────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='personal_goals') THEN
    DROP POLICY IF EXISTS personal_goals_select_owner ON public.personal_goals;
    DROP POLICY IF EXISTS personal_goals_service_all  ON public.personal_goals;
    DROP POLICY IF EXISTS personal_goals_update_owner ON public.personal_goals;
    DROP POLICY IF EXISTS personal_goals_delete_owner ON public.personal_goals;

    CREATE POLICY personal_goals_select_owner ON public.personal_goals
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY personal_goals_update_owner ON public.personal_goals
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    CREATE POLICY personal_goals_delete_owner ON public.personal_goals
      FOR DELETE TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY personal_goals_service_all ON public.personal_goals
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- ── 2. user_achievements ──────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='user_achievements') THEN
    DROP POLICY IF EXISTS user_achievements_select_owner ON public.user_achievements;
    DROP POLICY IF EXISTS user_achievements_select_all ON public.user_achievements;
    DROP POLICY IF EXISTS user_achievements_service_all ON public.user_achievements;

    CREATE POLICY user_achievements_select_all ON public.user_achievements
      FOR SELECT TO authenticated
      USING (true);

    CREATE POLICY user_achievements_service_all ON public.user_achievements
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- ── 3. bot_conversations + bot_messages ───────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='bot_conversations') THEN
    DROP POLICY IF EXISTS bot_conversations_select_owner ON public.bot_conversations;
    DROP POLICY IF EXISTS bot_conversations_service_all  ON public.bot_conversations;

    CREATE POLICY bot_conversations_select_owner ON public.bot_conversations
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY bot_conversations_service_all ON public.bot_conversations
      FOR ALL TO service_role USING (true) WITH CHECK (true);

    ALTER TABLE public.bot_conversations ENABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='bot_messages') THEN
    DROP POLICY IF EXISTS bot_messages_select_owner ON public.bot_messages;
    DROP POLICY IF EXISTS bot_messages_service_all  ON public.bot_messages;

    CREATE POLICY bot_messages_select_owner ON public.bot_messages
      FOR SELECT TO authenticated
      USING (
        conversation_id IN (
          SELECT id FROM public.bot_conversations WHERE user_id = auth.uid()
        )
      );

    CREATE POLICY bot_messages_service_all ON public.bot_messages
      FOR ALL TO service_role USING (true) WITH CHECK (true);

    ALTER TABLE public.bot_messages ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ── 4. user_saved_views ───────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='user_saved_views') THEN
    DROP POLICY IF EXISTS user_saved_views_select_owner ON public.user_saved_views;
    DROP POLICY IF EXISTS user_saved_views_service_all  ON public.user_saved_views;

    CREATE POLICY user_saved_views_select_owner ON public.user_saved_views
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY user_saved_views_service_all ON public.user_saved_views
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- ── 5. user_task_drafts ───────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='user_task_drafts') THEN
    DROP POLICY IF EXISTS user_task_drafts_select_owner ON public.user_task_drafts;
    DROP POLICY IF EXISTS user_task_drafts_service_all  ON public.user_task_drafts;

    CREATE POLICY user_task_drafts_select_owner ON public.user_task_drafts
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY user_task_drafts_service_all ON public.user_task_drafts
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END
$$;

COMMIT;
