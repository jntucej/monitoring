-- 20270131000040_group_chat.sql
-- Cohort, hierarchy, shift, and incident group chat tables with structured
-- circular/approval cards and "Noted" receipt tracking.
BEGIN;

CREATE TABLE IF NOT EXISTS public.chat_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  group_type TEXT NOT NULL CHECK (group_type IN ('class', 'hierarchy', 'shift', 'incident', 'custom')),
  scope_key TEXT,
  announcement_only BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_group_members (
  group_id UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL DEFAULT 'member' CHECK (member_role IN ('owner', 'moderator', 'member')),
  membership_source TEXT NOT NULL DEFAULT 'explicit' CHECK (membership_source IN ('explicit', 'roster_sync', 'role_sync', 'shift_sync')),
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  muted BOOLEAN NOT NULL DEFAULT FALSE,
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sender_kind TEXT NOT NULL DEFAULT 'user' CHECK (sender_kind IN ('user', 'agent', 'system')),
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'circular_card', 'approval_card', 'status_card')),
  body TEXT NOT NULL,
  ref_kind TEXT CHECK (ref_kind IN ('circular', 'workflow_instance', 'class_message', 'shift_handover')),
  ref_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_message_receipts (
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  seen_at TIMESTAMPTZ,
  noted_at TIMESTAMPTZ,
  note_text TEXT,
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_group_created
  ON public.chat_messages (group_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_group_members_user
  ON public.chat_group_members (user_id);

ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_receipts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_groups' AND policyname = 'chat_groups_member_read'
  ) THEN
    CREATE POLICY chat_groups_member_read ON public.chat_groups
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.chat_group_members m
          WHERE m.group_id = chat_groups.id
            AND m.user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
            AND m.effective_from <= NOW()
            AND (m.effective_to IS NULL OR m.effective_to > NOW())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_group_members' AND policyname = 'chat_group_members_self_read'
  ) THEN
    CREATE POLICY chat_group_members_self_read ON public.chat_group_members
      FOR SELECT USING (
        user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'chat_messages_member_read'
  ) THEN
    CREATE POLICY chat_messages_member_read ON public.chat_messages
      FOR SELECT USING (
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
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_message_receipts' AND policyname = 'chat_message_receipts_self'
  ) THEN
    CREATE POLICY chat_message_receipts_self ON public.chat_message_receipts
      FOR ALL USING (
        user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
      );
  END IF;
END $$;

COMMIT;
