-- 20270131000044_chat_moderation_and_mute.sql
-- Soft-delete / redaction columns on chat_messages for moderation & privacy.
BEGIN;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS redaction_reason TEXT;

COMMIT;
