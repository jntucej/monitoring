-- 20270131000021_campus_feed.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.campus_feed_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind           text NOT NULL CHECK (kind IN ('announcement', 'event', 'alert', 'circular', 'emergency')),
  title          text NOT NULL,
  body_md        text,
  attachments    jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_scope   text NOT NULL DEFAULT 'global',
  priority       text NOT NULL DEFAULT 'normal',
  posted_by      uuid NOT NULL,
  posted_by_role text NOT NULL,
  posted_at      timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz,
  status         text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('draft', 'active', 'expired', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_feed_active
  ON public.campus_feed_items (status, expires_at, posted_at DESC);

CREATE TABLE IF NOT EXISTS public.campus_feed_receipts (
  feed_id      uuid NOT NULL REFERENCES public.campus_feed_items(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL,
  seen_at      timestamptz,
  dismissed_at timestamptz,
  PRIMARY KEY (feed_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_receipts_user
  ON public.campus_feed_receipts (user_id, dismissed_at);

COMMIT;
