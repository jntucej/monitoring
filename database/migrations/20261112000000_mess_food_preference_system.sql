-- ============================================================================
-- Migration: 20261112000000_mess_food_preference_system
-- Purpose: Add Mess food preference system (3-layer model).
--   Layer 1: mess_menu_items + mess_menu_applicability (static catalog)
--   Layer 2: mess_days + mess_day_items (per-meal-day config + menu)
--   Layer 3: mess_preferences (student selection), mess_tokens (meal codes),
--            mess_meal_served (consumption), mess_notifications_log (audit)
-- Idempotent: all CREATE/ALTER use IF NOT EXISTS / ON CONFLICT DO NOTHING.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Layer 1: menu catalog
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mess_menu_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT NOT NULL,
  label        TEXT NOT NULL,
  is_primary   BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order   INT NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mess_menu_items_code_check CHECK (
    code IN ('VEG','NON_VEG','CHICKEN','PANEER','SWEET','CURD','PAPAD')
  )
);

CREATE TABLE IF NOT EXISTS public.mess_menu_applicability (
  menu_item_id  UUID NOT NULL REFERENCES public.mess_menu_items(id) ON DELETE CASCADE,
  applicable_to  TEXT NOT NULL,
  PRIMARY KEY (menu_item_id, applicable_to),
  CONSTRAINT mess_menu_applicability_scope_check CHECK (
    applicable_to IN ('VEG','NON_VEG','BOTH')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mess_menu_items_code
  ON public.mess_menu_items(code);
CREATE INDEX IF NOT EXISTS idx_mess_menu_items_active
  ON public.mess_menu_items(is_active) WHERE is_active;

-- ---------------------------------------------------------------------------
-- Layer 2: per-meal-day configuration
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mess_days (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_date         DATE NOT NULL,
  meal_type         TEXT NOT NULL DEFAULT 'LUNCH',
  day_type          TEXT NOT NULL,
  window_opens_at   TIMESTAMPTZ NOT NULL,
  window_closes_at  TIMESTAMPTZ NOT NULL,
  tokens_locked_at  TIMESTAMPTZ,
  tokens_revoked_at TIMESTAMPTZ,
  revoked_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mess_days_type_check CHECK (
    day_type IN ('SUNDAY','WEDNESDAY')
  ),
  CONSTRAINT mess_days_meal_type_check CHECK (
    meal_type IN ('LUNCH','BREAKFAST','DINNER')
  )
);

CREATE TABLE IF NOT EXISTS public.mess_day_items (
  mess_day_id   UUID NOT NULL REFERENCES public.mess_days(id) ON DELETE CASCADE,
  menu_item_id  UUID NOT NULL REFERENCES public.mess_menu_items(id) ON DELETE CASCADE,
  is_available  BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (mess_day_id, menu_item_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mess_days_date_type
  ON public.mess_days(meal_date, day_type);
CREATE INDEX IF NOT EXISTS idx_mess_days_active
  ON public.mess_days(is_active) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_mess_day_items_day
  ON public.mess_day_items(mess_day_id);

-- ---------------------------------------------------------------------------
-- Layer 3: student preferences, tokens, consumption, notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mess_preferences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mess_day_id   UUID NOT NULL REFERENCES public.mess_days(id) ON DELETE CASCADE,
  primary_item  TEXT NOT NULL,
  will_be_present BOOLEAN NOT NULL DEFAULT TRUE,
  hostel_block  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mess_preferences_user_day_unique UNIQUE (user_id, mess_day_id),
  CONSTRAINT mess_preferences_primary_check CHECK (
    primary_item IN ('VEG','NON_VEG')
  )
);

CREATE TABLE IF NOT EXISTS public.mess_preference_sub_items (
  preference_id  UUID NOT NULL REFERENCES public.mess_preferences(id) ON DELETE CASCADE,
  menu_item_id   UUID NOT NULL REFERENCES public.mess_menu_items(id) ON DELETE CASCADE,
  PRIMARY KEY (preference_id, menu_item_id)
);

CREATE TABLE IF NOT EXISTS public.mess_default_preferences (
  user_id        UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  primary_item   TEXT NOT NULL,
  sub_item_ids   UUID[] NOT NULL DEFAULT '{}',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mess_default_prefs_primary_check CHECK (
    primary_item IN ('VEG','NON_VEG')
  )
);

CREATE TABLE IF NOT EXISTS public.mess_tokens (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mess_day_id       UUID NOT NULL REFERENCES public.mess_days(id) ON DELETE CASCADE,
  token_code        TEXT NOT NULL,
  qr_payload_hash   TEXT NOT NULL,
  primary_item      TEXT NOT NULL,
  sub_item_labels   TEXT[] NOT NULL DEFAULT '{}',
  expires_at        TIMESTAMPTZ NOT NULL,
  used_at           TIMESTAMPTZ,
  used_by           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  revoked_at        TIMESTAMPTZ,
  revoked_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mess_tokens_user_day_unique UNIQUE (user_id, mess_day_id),
  CONSTRAINT mess_tokens_primary_check CHECK (
    primary_item IN ('VEG','NON_VEG')
  )
);

CREATE TABLE IF NOT EXISTS public.mess_meal_served (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mess_day_id UUID NOT NULL REFERENCES public.mess_days(id) ON DELETE CASCADE,
  token_id   UUID NOT NULL REFERENCES public.mess_tokens(id) ON DELETE CASCADE,
  served_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  method     TEXT NOT NULL,
  served_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT mess_meal_served_method_check CHECK (
    method IN ('SCAN','MANUAL')
  ),
  CONSTRAINT mess_meal_served_user_day_unique UNIQUE (user_id, mess_day_id)
);

CREATE TABLE IF NOT EXISTS public.mess_notifications_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  mess_day_id  UUID NOT NULL,
  event_type   TEXT NOT NULL,
  channel      TEXT NOT NULL DEFAULT 'in_app',
  status       TEXT NOT NULL DEFAULT 'pending',
  payload      JSONB,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mess_notifications_status_check CHECK (
    status IN ('pending','sent','failed','skipped')
  ),
  CONSTRAINT mess_notifications_channel_check CHECK (
    channel IN ('in_app','email','sms','push','telegram')
  )
);

-- ---------------------------------------------------------------------------
-- Indexes (performance-critical)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_mess_preferences_user_day
  ON public.mess_preferences(user_id, mess_day_id);
CREATE INDEX IF NOT EXISTS idx_mess_tokens_user_day
  ON public.mess_tokens(user_id, mess_day_id);
CREATE INDEX IF NOT EXISTS idx_mess_tokens_code
  ON public.mess_tokens(token_code);
CREATE INDEX IF NOT EXISTS idx_mess_tokens_expires
  ON public.mess_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_mess_notifications_user_day
  ON public.mess_notifications_log(user_id, mess_day_id);
CREATE INDEX IF NOT EXISTS idx_mess_meal_served_user_day
  ON public.mess_meal_served(user_id, mess_day_id);

-- ---------------------------------------------------------------------------
-- Seed Layer 1 catalog (idempotent)
-- ---------------------------------------------------------------------------
INSERT INTO public.mess_menu_items (code, label, is_primary, sort_order, is_active)
VALUES
  ('VEG',    'Vegetarian',     TRUE,  1, TRUE),
  ('NON_VEG','Non-Vegetarian', TRUE,  2, TRUE),
  ('CHICKEN','Chicken',        FALSE, 3, TRUE),
  ('PANEER', 'Paneer',        FALSE, 4, TRUE),
  ('SWEET',  'Sweet',         FALSE, 5, TRUE),
  ('CURD',   'Curd',         FALSE, 6, TRUE),
  ('PAPAD',  'Papad',        FALSE, 7, TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.mess_menu_applicability (menu_item_id, applicable_to)
SELECT id, 'BOTH' FROM public.mess_menu_items WHERE code = 'VEG'
  AND NOT EXISTS (SELECT 1 FROM public.mess_menu_applicability a
                  WHERE a.menu_item_id = (SELECT id FROM public.mess_menu_items WHERE code='VEG')
                    AND a.applicable_to='BOTH');

INSERT INTO public.mess_menu_applicability (menu_item_id, applicable_to)
SELECT id, 'BOTH' FROM public.mess_menu_items WHERE code = 'NON_VEG'
  AND NOT EXISTS (SELECT 1 FROM public.mess_menu_applicability a
                  WHERE a.menu_item_id = (SELECT id FROM public.mess_menu_items WHERE code='NON_VEG')
                    AND a.applicable_to='BOTH');

INSERT INTO public.mess_menu_applicability (menu_item_id, applicable_to)
SELECT id, 'NON_VEG' FROM public.mess_menu_items WHERE code = 'CHICKEN'
  AND NOT EXISTS (SELECT 1 FROM public.mess_menu_applicability a
                  WHERE a.menu_item_id = (SELECT id FROM public.mess_menu_items WHERE code='CHICKEN')
                    AND a.applicable_to='NON_VEG');

INSERT INTO public.mess_menu_applicability (menu_item_id, applicable_to)
SELECT id, 'NON_VEG' FROM public.mess_menu_items WHERE code = 'PANEER'
  AND NOT EXISTS (SELECT 1 FROM public.mess_menu_applicability a
                  WHERE a.menu_item_id = (SELECT id FROM public.mess_menu_items WHERE code='PANEER')
                    AND a.applicable_to='NON_VEG');

-- Record this migration in schema_migrations
INSERT INTO public.schema_migrations (version)
VALUES ('20261112000000')
ON CONFLICT (version) DO NOTHING;
