-- 20261026000000_dev_contact_channel.sql
-- Direct-to-developer contact channel: every user can send improvement/feedback
-- messages to the developer via the project's Telegram bot. Their identity
-- (name, role, email, user id) is attached server-side.
BEGIN;

-- 1. Per-user opt-in flag (default ON => available to everyone)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS dev_contact_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.users.dev_contact_enabled IS
  'When true this user may send direct developer messages via /api/dev/contact.';

-- 2. Message store
CREATE TABLE IF NOT EXISTS public.developer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  user_name TEXT,
  user_role TEXT,
  user_email TEXT,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  channel TEXT NOT NULL DEFAULT 'web' CHECK (channel IN ('web', 'scan', 'student', 'support')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dev_msgs_unread ON public.developer_messages (created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dev_msgs_user ON public.developer_messages (user_id, created_at DESC);

ALTER TABLE public.developer_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='developer_messages'
      AND policyname='service_role_all_developer_messages'
  ) THEN
    CREATE POLICY "service_role_all_developer_messages" ON public.developer_messages
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. Whitelist the new audit action in the known-actions constraint (handled by 20261027000000_audit_action_canonical.sql)
-- This migration no longer modifies audit_logs_action_known

COMMIT;
