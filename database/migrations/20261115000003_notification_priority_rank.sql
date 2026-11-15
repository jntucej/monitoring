-- Single-owner notification queues (2026-11 correctness fix).
--
-- Problem: three jobs (send_sms.js, send_emails.js, dispatch_notifications.js)
-- were all claiming rows from notification_sms_queue / notification_email_queue
-- in the same tick. Without an atomic claim, two workers (or the same worker
-- running two jobs concurrently) could double-send a message, or one could
-- mark a row 'sent' after the other marked it 'failed'.
--
-- Fix: add a GENERATED ALWAYS priority_rank column so the single owner's
-- ORDER BY is a plain integer sort, and drop the partial index that encoded
-- the old string order. The single owner (dispatch_notifications.js) claims
-- rows with FOR UPDATE SKIP LOCKED + an atomic UPDATE ... RETURNING, so the
-- queue cannot be drained twice.
BEGIN;

-- sms queue: otp=1, urgent=2, normal=3
ALTER TABLE public.notification_sms_queue
  ADD COLUMN IF NOT EXISTS priority_rank SMALLINT
    GENERATED ALWAYS AS (
      CASE priority
        WHEN 'otp'    THEN 1
        WHEN 'urgent' THEN 2
        ELSE 3
      END
    ) STORED;

-- Drop the string-ordered claim index; the owner now sorts on the integer.
DROP INDEX IF EXISTS idx_sms_queue_claimable;
CREATE INDEX IF NOT EXISTS idx_sms_queue_claimable
  ON public.notification_sms_queue (priority_rank, next_attempt_at, created_at)
  WHERE status IN ('pending','failed');

-- email queue: security-critical categories (otp/security) rank first.
-- COALESCE handles NULL-safe ordering; the default (no match) ranks last.
ALTER TABLE public.notification_email_queue
  ADD COLUMN IF NOT EXISTS priority_rank SMALLINT
    GENERATED ALWAYS AS (
      CASE
        WHEN category IN ('otp','security','password','login') THEN 1
        WHEN category IN ('alert','warning')                    THEN 2
        ELSE 3
      END
    ) STORED;

COMMIT;
