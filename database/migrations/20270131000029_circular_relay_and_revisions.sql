-- 20270131000029_circular_relay_and_revisions.sql
BEGIN;

ALTER TABLE public.circular_requests
  DROP CONSTRAINT IF EXISTS circular_requests_status_check;

ALTER TABLE public.circular_requests
  ADD CONSTRAINT circular_requests_status_check
    CHECK (status IN (
      'draft', 'pending_vp', 'pending_principal', 'revision_requested',
      'approved', 'rejected', 'published', 'withdrawn', 'superseded'
    )),
  ADD COLUMN IF NOT EXISTS revision_remarks text,
  ADD COLUMN IF NOT EXISTS supersedes_id uuid REFERENCES public.circular_requests(id),
  ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz,
  ADD COLUMN IF NOT EXISTS withdrawn_reason text,
  ADD COLUMN IF NOT EXISTS has_stamp_or_sig boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_attachment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS faculty_relay_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS staff_duty_required boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.circular_relays (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circular_id     uuid NOT NULL REFERENCES public.circular_requests(id) ON DELETE CASCADE,
  relayed_by      uuid NOT NULL,
  relayed_by_role text NOT NULL,
  relay_chain     text NOT NULL CHECK (relay_chain IN ('academic', 'operational')),
  target_label    text NOT NULL,
  notes           text,
  relayed_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_circular_relays_circ
  ON public.circular_relays (circular_id, relayed_at DESC);

ALTER TABLE public.campus_feed_receipts
  ADD COLUMN IF NOT EXISTS noted_remark text,
  ADD COLUMN IF NOT EXISTS shared_by uuid;

COMMIT;
