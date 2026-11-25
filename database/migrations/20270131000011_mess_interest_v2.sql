-- 20270131000011_mess_interest_v2.sql
-- Conversion-gated interest polls v2: yes/maybe/no, participation threshold,
-- recency weighting, and post-trial conversion tracking.

BEGIN;

CREATE TABLE IF NOT EXISTS public.mess_interest_polls (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposed_item     text NOT NULL,
  meal_type         text NOT NULL,
  scheduled_for     date,
  counter_id        uuid REFERENCES public.mess_counters(id),
  target_scope      text NOT NULL DEFAULT 'mess',
  opens_at          timestamptz NOT NULL DEFAULT now(),
  closes_at         timestamptz NOT NULL,
  participation_min numeric NOT NULL DEFAULT 0.40,
  approval_min      numeric NOT NULL DEFAULT 0.60,
  status            text NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'closed', 'approved', 'rejected')),
  result            jsonb,
  created_by        uuid NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mess_interest_votes (
  poll_id  uuid NOT NULL REFERENCES public.mess_interest_polls(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL,
  vote     text NOT NULL CHECK (vote IN ('yes', 'maybe', 'no')),
  voted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.mess_interest_conversions (
  poll_id         uuid PRIMARY KEY REFERENCES public.mess_interest_polls(id) ON DELETE CASCADE,
  session_id      uuid NOT NULL REFERENCES public.mess_days(id) ON DELETE CASCADE,
  yes_voters      int NOT NULL,
  actually_served int NOT NULL,
  conversion_pct  numeric,
  recorded_at     timestamptz NOT NULL DEFAULT now()
);

COMMIT;
