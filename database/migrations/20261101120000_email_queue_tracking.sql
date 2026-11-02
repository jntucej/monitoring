-- Brevo email relay: extend notification_email_queue with tracking columns
-- for async dispatch, audit, retry, and daily-quota enforcement.
-- Idempotent: safe to re-run.
ALTER TABLE public.notification_email_queue
  ADD COLUMN IF NOT EXISTS sent_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error                TEXT,
  ADD COLUMN IF NOT EXISTS provider_message_id  TEXT,
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS category             TEXT NOT NULL DEFAULT 'generic';

CREATE INDEX IF NOT EXISTS idx_email_queue_pending
  ON public.notification_email_queue (created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_queue_category_status
  ON public.notification_email_queue (category, status);

-- Self-record migration (adaptive DO $$ pattern from prior migrations).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations WHERE version = '20261030091615_email_queue_tracking'
  ) THEN
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261030091615_email_queue_tracking', now());
  END IF;
END $$;
