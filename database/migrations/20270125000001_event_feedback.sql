-- Migration: event_feedback table — the VERIFY step of the event loop.
-- A student rates an event they attended (1-5) + optional tags + note.
-- Feeds Achievements ("food critic" → "event regular") + CampusFeed +
-- the organizer's post-event view.

CREATE TABLE IF NOT EXISTS public.event_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL,
  user_id     UUID NOT NULL,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  tags        TEXT[],
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_feedback_event ON public.event_feedback (event_id);
CREATE INDEX IF NOT EXISTS idx_event_feedback_user ON public.event_feedback (user_id);

-- Annotate event_registrations with a "feedback_given" flag so the status
-- card can show "rated ✓" without a join.
ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS feedback_given BOOLEAN NOT NULL DEFAULT FALSE;
