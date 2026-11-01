-- 20270101000016_notification_queue_delivery_columns.sql
-- Backfills the delivery-tracking columns the notification dispatch worker
-- (worker/jobs/dispatch_notifications.js) needs in order to mark SMS rows
-- 'delivered' with the provider message id, and to record a failure reason
-- instead of silently marking rows 'sent' without a real send.
--
-- notification_sms_queue gains:
--   provider_message_id  TEXT            — Twilio (or other) message SID
--   processing_started_at TIMESTAMPTZ   — when this dispatch pass picked it up
--   error                TEXT           — last failure reason (set on 'failed'/'dead')
--
-- Idempotent: ADD COLUMN IF NOT EXISTS. Fresh databases created before the
-- dispatch job was ever run simply get the columns; existing databases have
-- the columns added here (or already have them — no-op).

ALTER TABLE public.notification_sms_queue
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error TEXT;
