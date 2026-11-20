-- 20270124000001_universal_disputes.sql
--
-- Universal dispute API: one endpoint handles "I was marked absent",
-- "I attended but wasn't marked", "my meal was cold", "my pass was
-- rejected unfairly". Each has an entity_type + entity_id + reason +
-- evidence. Routes via the escalation LADDER.

CREATE TABLE IF NOT EXISTS public.disputes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  entity_type     TEXT NOT NULL,           -- 'attendance' | 'event' | 'meal' | 'pass' | 'document' | 'complaint'
  entity_id       TEXT NOT NULL,
  reason          TEXT NOT NULL,
  evidence        JSONB NOT NULL DEFAULT '{}'::jsonb,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'resolved', 'rejected')),
  resolution_note TEXT NOT NULL DEFAULT '',
  escalated_to    TEXT,                    -- role the dispute was escalated to
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_disputes_user ON public.disputes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_disputes_entity ON public.disputes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_disputes_open ON public.disputes(status) WHERE status = 'open';

GRANT SELECT, INSERT, UPDATE ON public.disputes TO gate_app, admin, authenticated;
