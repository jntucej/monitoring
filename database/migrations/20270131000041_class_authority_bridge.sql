-- 20270131000041_class_authority_bridge.sql
-- Single class group binding + Authority Bridge ("Send Doubt to Authority")
-- for student class threads.
BEGIN;

ALTER TABLE public.chat_groups
  ADD COLUMN IF NOT EXISTS class_id TEXT,
  ADD COLUMN IF NOT EXISTS is_single_class_room BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_groups_single_class
  ON public.chat_groups (class_id)
  WHERE group_type = 'class' AND class_id IS NOT NULL AND is_archived = FALSE;

CREATE TABLE IF NOT EXISTS public.class_doubt_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  source_message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  asked_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  routed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  topic TEXT NOT NULL CHECK (topic IN ('academic', 'timetable', 'exam', 'hostel', 'curfew', 'campus', 'policy')),
  question TEXT NOT NULL,
  target_role TEXT NOT NULL,
  escalation_chain TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'routed', 'answered', 'closed')),
  authority_reply TEXT,
  answered_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  answered_at TIMESTAMPTZ,
  publish_to_class BOOLEAN NOT NULL DEFAULT FALSE,
  published_message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_class_doubt_group_status
  ON public.class_doubt_escalations (group_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_class_doubt_target_role
  ON public.class_doubt_escalations (target_role, status);

ALTER TABLE public.class_doubt_escalations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'class_doubt_escalations' AND policyname = 'class_doubt_member_or_target_read'
  ) THEN
    CREATE POLICY class_doubt_member_or_target_read ON public.class_doubt_escalations
      FOR SELECT USING (
        asked_by = NULLIF(current_setting('app.user_id', true), '')::uuid
        OR publish_to_class = TRUE
        OR target_role = NULLIF(current_setting('app.role', true), '')
      );
  END IF;
END $$;

COMMIT;
