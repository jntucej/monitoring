BEGIN;

-- Allow authenticated app requests to insert agent_traces (read remains sysadmin/admin only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_traces' AND policyname = 'agent_traces_insert_all'
  ) THEN
    CREATE POLICY agent_traces_insert_all ON public.agent_traces
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Allow active group members to insert/update chat_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'chat_messages_member_insert'
  ) THEN
    CREATE POLICY chat_messages_member_insert ON public.chat_messages
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.chat_group_members m
          WHERE m.group_id = chat_messages.group_id
            AND m.user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
            AND m.effective_from <= NOW()
            AND (m.effective_to IS NULL OR m.effective_to > NOW())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'chat_messages_member_update'
  ) THEN
    CREATE POLICY chat_messages_member_update ON public.chat_messages
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.chat_group_members m
          WHERE m.group_id = chat_messages.group_id
            AND m.user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
            AND m.effective_from <= NOW()
            AND (m.effective_to IS NULL OR m.effective_to > NOW())
        )
      );
  END IF;
END $$;

-- Allow group creation & member updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_groups' AND policyname = 'chat_groups_insert_all'
  ) THEN
    CREATE POLICY chat_groups_insert_all ON public.chat_groups
      FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_groups' AND policyname = 'chat_groups_member_update'
  ) THEN
    CREATE POLICY chat_groups_member_update ON public.chat_groups
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.chat_group_members m
          WHERE m.group_id = chat_groups.id
            AND m.user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_group_members' AND policyname = 'chat_group_members_insert_all'
  ) THEN
    CREATE POLICY chat_group_members_insert_all ON public.chat_group_members
      FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_group_members' AND policyname = 'chat_group_members_self_update'
  ) THEN
    CREATE POLICY chat_group_members_self_update ON public.chat_group_members
      FOR UPDATE USING (
        user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
      );
  END IF;
END $$;

-- Allow class_doubt_escalations & confirmed_knowledge writes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'class_doubt_escalations' AND policyname = 'class_doubt_write_all'
  ) THEN
    CREATE POLICY class_doubt_write_all ON public.class_doubt_escalations
      FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'confirmed_knowledge' AND policyname = 'confirmed_knowledge_write_all'
  ) THEN
    CREATE POLICY confirmed_knowledge_write_all ON public.confirmed_knowledge
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMIT;
