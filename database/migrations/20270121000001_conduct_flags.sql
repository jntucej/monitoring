-- 20270121000001_conduct_flags.sql
--
-- Code-of-conduct ledger + graduated flags.
--
-- conduct_events: append-only ledger of violations.
-- conduct_flags:  materialized current-flag state per user.
--
-- These two tables together replace the binary flagStatus with a
-- graduated FlagLevel (clear → watch → probation → suspended → banned).

CREATE TABLE IF NOT EXISTS public.conduct_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL
              CHECK (event_type IN (
                'late_return', 'curfew_breach', 'quota_abuse',
                'false_dispute', 'doc_fraud', 'repeated_complaint_subject',
                'manual'
              )),
  severity    TEXT NOT NULL DEFAULT 'minor'
              CHECK (severity IN ('minor', 'major', 'critical')),
  domain      TEXT NOT NULL DEFAULT 'hostel',
  description TEXT NOT NULL DEFAULT '',
  evidence_url TEXT,
  recorded_by UUID REFERENCES public.users(id),
  ticket_id   UUID,
  expires_at  TIMESTAMPTZ,
  reversed    BOOLEAN NOT NULL DEFAULT FALSE,
  reversal_reason TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conduct_events_user ON public.conduct_events (user_id, created_at DESC);
CREATE INDEX idx_conduct_events_type ON public.conduct_events (event_type, created_at DESC);
CREATE INDEX idx_conduct_events_active ON public.conduct_events (user_id, expires_at) WHERE reversed = FALSE;

CREATE TABLE IF NOT EXISTS public.conduct_flags (
  user_id           UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  current_flag      TEXT NOT NULL DEFAULT 'clear'
                    CHECK (current_flag IN ('clear', 'watch', 'probation', 'suspended', 'banned')),
  reason            TEXT NOT NULL DEFAULT '',
  triggered_by_event_id UUID REFERENCES public.conduct_events(id),
  set_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ,
  cleared_by        UUID REFERENCES public.users(id),
  cleared_at        TIMESTAMPTZ,
  cleared_reason    TEXT
);

CREATE INDEX idx_conduct_flags_active ON public.conduct_flags (current_flag, expires_at) WHERE current_flag != 'clear';

-- Grant access to the app role
GRANT SELECT, INSERT, UPDATE ON public.conduct_events TO gate_app, admin, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conduct_flags TO gate_app, admin, authenticated;
