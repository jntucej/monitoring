-- 20261030000001_deduplicate_notifications_read_state.sql
-- Deduplicate notifications `read` / `read_at` state.
--
-- R3-13: The notifications table had both `read BOOLEAN` and `read_at
-- TIMESTAMPTZ`. Code wrote one and read the other, so marking a notification
-- as read via `read_at` didn't hide it from the inbox (which filtered on
-- `read = FALSE`).
--
-- Fix: backfill `read_at` from `read`, then drop the `read` column entirely.
-- All queries must switch from `read = TRUE/FALSE` to `read_at IS NOT NULL/NULL`.

-- 1. Backfill read_at for any rows that were marked read but have no timestamp
UPDATE public.notifications
SET read_at = COALESCE(read_at, created_at)
WHERE read = TRUE AND read_at IS NULL;

-- 2. Drop the redundant `read` column
ALTER TABLE public.notifications DROP COLUMN IF EXISTS read;

-- 3. Update index: replace idx_notif_read (on `read`) with one on `read_at`
DROP INDEX IF EXISTS public.idx_notif_read;
CREATE INDEX IF NOT EXISTS idx_notif_read_at ON public.notifications(read_at);
