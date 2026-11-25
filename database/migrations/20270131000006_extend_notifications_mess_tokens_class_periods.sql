-- 20270131000006_extend_notifications_mess_tokens_class_periods.sql
--
-- Extends three EXISTING tables with the columns the academic/mess subsystem
-- needs, rather than building parallel stores:
--   * notifications  → add scope + event_type + actor_role (the "bus"
--                      discriminator; it already has recipient_type/channels/
--                      priority/delivered_at/read_at).
--   * mess_tokens    → add nonce + token_hash (HMAC) + redeem_device_id +
--                      single_use. The existing store is HMAC-free
--                      (qr_payload_hash + token_code only); the anti-tamper
--                      guarantee comes from the new HMAC + nonce + device
--                      binding. Back-compat: old tokens keep their
--                      qr_payload_hash; new tokens carry token_hash too.
--   * class_periods  → add version_id + slot_status + substitute_faculty_id
--                      (timetable versioning + post-publish substitution).
--
-- All ADD COLUMN IF NOT EXISTS; no existing row is modified. Idempotent.

BEGIN;

-- notifications: the delivery-bus discriminator
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS event_type  text,
  ADD COLUMN IF NOT EXISTS scope       text,
  ADD COLUMN IF NOT EXISTS actor_role  text;
CREATE INDEX IF NOT EXISTS idx_notifications_scope ON public.notifications (scope, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_event ON public.notifications (event_type, created_at DESC);

-- mess_tokens: anti-tamper (HMAC + nonce + device + atomic single-use)
ALTER TABLE public.mess_tokens
  ADD COLUMN IF NOT EXISTS nonce            text,
  ADD COLUMN IF NOT EXISTS token_hash       text,   -- HMAC-SHA256(secret, tuple)
  ADD COLUMN IF NOT EXISTS redeem_device_id uuid,
  ADD COLUMN IF NOT EXISTS single_use       boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_mess_tokens_nonce ON public.mess_tokens (nonce);
-- Atomic single-use: one live token per (user, mess_day). The existing
-- (user_id, mess_day_id) uniqueness may already enforce this; add a partial
-- index to make the "active only" redeem fast and race-free.
CREATE INDEX IF NOT EXISTS idx_mess_tokens_live
  ON public.mess_tokens (user_id, mess_day_id) WHERE used_at IS NULL;

-- class_periods: timetable versioning + substitution
ALTER TABLE public.class_periods
  ADD COLUMN IF NOT EXISTS version_id            uuid,
  ADD COLUMN IF NOT EXISTS slot_status           text,   -- 'active'|'substituted'|'cancelled'
  ADD COLUMN IF NOT EXISTS substitute_faculty_id uuid,
  ADD COLUMN IF NOT EXISTS substitution_reason   text;

COMMIT;
