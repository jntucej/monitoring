-- Ensure base bot and knowledge base tables exist
CREATE TABLE IF NOT EXISTS public.bot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.bot_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kb_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source TEXT,
  roles TEXT[] NOT NULL DEFAULT ARRAY['all'],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kb_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.kb_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add language tracking to bot messages
ALTER TABLE public.bot_messages
  ADD COLUMN IF NOT EXISTS lang TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en','te')),
  ADD COLUMN IF NOT EXISTS source_lang TEXT,
  ADD COLUMN IF NOT EXISTS feedback SMALLINT CHECK (feedback IN (-1, 1));

-- Track per-user language preference so we can auto-open in the right language
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bot_lang TEXT NOT NULL DEFAULT 'en' CHECK (bot_lang IN ('en','te')),
  ADD COLUMN IF NOT EXISTS bot_voice_replies BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_bot_msg_feedback
  ON public.bot_messages(feedback) WHERE feedback IS NOT NULL;

-- Extend the audit action allow-list (handled by 20261027000000_audit_action_canonical.sql)
-- This migration no longer modifies audit_logs_action_known
