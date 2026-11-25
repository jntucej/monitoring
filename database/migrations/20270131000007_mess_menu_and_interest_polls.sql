-- 20270131000007_mess_menu_and_interest_polls.sql
--
-- The genuinely-missing mess pieces: a *weekly* menu (distinct from the
-- existing mess_menu_items catalog of dish codes/labels) + the "who's
-- interested in this new item?" poll. The daily menu already lives in
-- mess_days + mess_day_items + mess_tokens; this adds the planning/publishing
-- layer on top.
--
-- mess_weekly_items references the existing mess_menu_items catalog by id
-- (a weekly menu picks catalog dishes), so there is no second catalog.

BEGIN;

CREATE TABLE IF NOT EXISTS public.mess_menus (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start       date NOT NULL,
  version          int  NOT NULL DEFAULT 1,
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','published','superseded')),
  created_by       uuid NOT NULL,
  published_by     uuid,
  published_at     timestamptz,
  committee_signoff jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_start, version)
);

CREATE TABLE IF NOT EXISTS public.mess_weekly_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id         uuid NOT NULL REFERENCES public.mess_menus(id) ON DELETE CASCADE,
  catalog_item_id uuid NOT NULL REFERENCES public.mess_menu_items(id),  -- existing catalog
  day_of_week     int  NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  meal_type       text NOT NULL,
  category        text NOT NULL,
  allergens       text[] NOT NULL DEFAULT '{}',
  is_new          boolean NOT NULL DEFAULT false,
  status          text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','approved','rejected','published')),
  UNIQUE (menu_id, catalog_item_id, day_of_week, meal_type)
);
CREATE INDEX IF NOT EXISTS idx_mess_weekly_items_menu ON public.mess_weekly_items (menu_id, status);

CREATE TABLE IF NOT EXISTS public.mess_item_interest_polls (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_item_id   uuid NOT NULL REFERENCES public.mess_weekly_items(id) ON DELETE CASCADE,
  opens_at         timestamptz NOT NULL DEFAULT now(),
  closes_at        timestamptz NOT NULL,
  min_interest_pct numeric NOT NULL DEFAULT 0.60,
  target_scope     text NOT NULL DEFAULT 'mess',
  status           text NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','closed','approved','rejected')),
  result_json      jsonb
);
CREATE INDEX IF NOT EXISTS idx_mess_polls_item ON public.mess_item_interest_polls (weekly_item_id, status);

CREATE TABLE IF NOT EXISTS public.mess_item_interest_votes (
  poll_id  uuid NOT NULL REFERENCES public.mess_item_interest_polls(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL,
  vote     text NOT NULL CHECK (vote IN ('yes','no','maybe')),
  voted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)
);

-- Scan-attempt log (every /api/mess/serve result, including failures,
-- duplicates, hmac_fail — feeds the daily anomaly worker).
CREATE TABLE IF NOT EXISTS public.mess_scan_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id     uuid,
  student_id   uuid,
  mess_day_id  uuid,
  scanned_by   uuid,
  device_id    uuid,
  result       text NOT NULL,   -- 'ok','duplicate','expired','revoked','hmac_fail','malformed','not_issued','wrong_session','wrong_device'
  scanned_at   timestamptz NOT NULL DEFAULT now(),
  raw_payload  jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_mess_scan_log_day ON public.mess_scan_log (mess_day_id, scanned_at DESC);

COMMIT;
