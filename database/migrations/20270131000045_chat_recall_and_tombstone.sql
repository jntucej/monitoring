-- 20270131000045_chat_recall_and_tombstone.sql
-- Recall / corrigendum fields on chat_messages for mistaken announcements.
BEGIN;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS recalled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recalled_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recall_reason TEXT,
  ADD COLUMN IF NOT EXISTS superseded_by_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL;

COMMIT;
