-- 20270131000025_security_handover_and_extra_shifts.sql
BEGIN;

ALTER TABLE public.security_shifts
  ADD COLUMN IF NOT EXISTS is_extra boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS extra_reason text;

CREATE TABLE IF NOT EXISTS public.shift_handover_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id         uuid NOT NULL REFERENCES public.security_shifts(id) ON DELETE CASCADE,
  post_id          uuid NOT NULL REFERENCES public.security_posts(id),
  from_operator_id uuid NOT NULL,
  to_operator_id   uuid NOT NULL,
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  notes            text,
  requested_at     timestamptz NOT NULL DEFAULT now(),
  responded_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_handover_to_op
  ON public.shift_handover_requests (to_operator_id, status);

COMMIT;
