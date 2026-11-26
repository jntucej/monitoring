-- 20270131000043_agent_traces.sql
-- Observability trace table for Agent Turn Pipeline (lane, tool, match type, latency).
BEGIN;

CREATE TABLE IF NOT EXISTS public.agent_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  session_id TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL,
  lane TEXT NOT NULL CHECK (lane IN ('chat', 'tool', 'ocr', 'classifier')),
  tool_name TEXT,
  tool_status TEXT CHECK (tool_status IN ('ok', 'denied', 'empty', 'error')),
  knowledge_match_type TEXT CHECK (knowledge_match_type IN ('exact', 'partial', 'none')),
  draft_emitted BOOLEAN NOT NULL DEFAULT FALSE,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_traces_created
  ON public.agent_traces (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_traces_request
  ON public.agent_traces (request_id);

ALTER TABLE public.agent_traces ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_traces' AND policyname = 'agent_traces_sysadmin_read'
  ) THEN
    CREATE POLICY agent_traces_sysadmin_read ON public.agent_traces
      FOR SELECT USING (
        NULLIF(current_setting('app.role', true), '') IN ('sysadmin', 'admin')
      );
  END IF;
END $$;

COMMIT;
