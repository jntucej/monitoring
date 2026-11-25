-- 20270131000028_circular_pipeline.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.circular_requests (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title              text NOT NULL,
  circular_no        text,
  issued_by          text,
  effective_date     date,
  deadline           date,
  summary            text,
  raw_ocr_text       text,
  attachment_url     text,
  classified_targets jsonb NOT NULL DEFAULT '{}'::jsonb,
  edited_fields      jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_required    boolean NOT NULL DEFAULT false,
  status             text NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft', 'pending_vp', 'pending_principal', 'approved', 'rejected', 'published')),
  requested_by       uuid NOT NULL,
  requested_by_role  text NOT NULL,
  vp_reviewed_by     uuid,
  vp_reviewed_at     timestamptz,
  approved_by        uuid,
  approved_at        timestamptz,
  rejection_reason   text,
  feed_item_id       uuid REFERENCES public.campus_feed_items(id),
  share_token        text UNIQUE,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_circular_requests_status
  ON public.circular_requests (status, created_at DESC);

ALTER TABLE public.campus_feed_receipts
  ADD COLUMN IF NOT EXISTS noted_at timestamptz;

COMMIT;
