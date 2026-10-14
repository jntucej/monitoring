-- ============================================================================
-- Notification Engagement Prefs
-- Adds engagement_prefs JSONB column to notification_preferences so that
-- the richer client-side engagement notification settings (quietHours,
-- dailySummary, eventReminders, etc.) can be persisted server-side.
-- ============================================================================

BEGIN;

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS engagement_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMIT;
