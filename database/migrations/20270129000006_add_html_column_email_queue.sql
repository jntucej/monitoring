-- 20270129000006_add_html_column_email_queue.sql
--
-- P0 fix: src/lib/integrations/email.ts inserts an `html` field into
-- notification_email_queue (lines 37, 86, 122), but the table never had
-- that column — every email-queue insert failed with
--   column "html" of relation "notification_email_queue" does not exist
--
-- This adds the missing column so the code's intent (store an HTML version
-- of the email alongside the plain-text `body`) is realized. Idempotent:
-- ADD COLUMN IF NOT EXISTS is safe to re-run.
--
-- Backward compatible: existing rows get NULL for `html`; the dispatch
-- layer falls back to `body` when `html` is null (email.ts already does
-- `params.html || params.body`).

ALTER TABLE public.notification_email_queue
  ADD COLUMN IF NOT EXISTS html TEXT;

-- Index: the dispatch job scans pending emails by status + priority.
-- (No new index needed — the existing status/priority queries are covered
--  by the table's existing access patterns; adding one here is optional
--  and would only help at high volume.)

COMMENT ON COLUMN public.notification_email_queue.html
  IS 'HTML version of the email body. Null when only plain-text is available; dispatch falls back to body.';
