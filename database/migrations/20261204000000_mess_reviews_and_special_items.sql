-- Mess: Meal Reviews + Special-Item Interest System + Secure Event Tokens
-- Additive: does not touch mess_days / mess_tokens (regular meals).
-- Meal types align with public.mess_days (BREAKFAST|LUNCH|DINNER).

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Meal reviews — every day, per meal
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mess_meal_reviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  review_date  DATE NOT NULL,
  meal_type    TEXT NOT NULL CHECK (meal_type IN ('BREAKFAST','LUNCH','DINNER')),
  satisfaction TEXT NOT NULL CHECK (satisfaction IN ('VERY_GOOD','GOOD','AVERAGE','BAD','VERY_BAD')),
  comment      TEXT CHECK (comment IS NULL OR char_length(comment) <= 280),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mess_meal_reviews_user_day_meal_unique UNIQUE (user_id, review_date, meal_type)
);
CREATE INDEX IF NOT EXISTS idx_mess_reviews_date_meal ON public.mess_meal_reviews (review_date DESC, meal_type);
CREATE INDEX IF NOT EXISTS idx_mess_reviews_user      ON public.mess_meal_reviews (user_id, review_date DESC);

ALTER TABLE public.mess_meal_reviews ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mess_meal_reviews' AND policyname='svc_all_mess_meal_reviews') THEN
    CREATE POLICY svc_all_mess_meal_reviews ON public.mess_meal_reviews FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Special events (announced ahead of the event, with an interest deadline
--    and a serving window)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mess_special_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  event_date        DATE NOT NULL,
  meal_type         TEXT NOT NULL DEFAULT 'LUNCH' CHECK (meal_type IN ('BREAKFAST','LUNCH','DINNER')),
  announcement_at   TIMESTAMPTZ NOT NULL,
  interest_deadline TIMESTAMPTZ NOT NULL,
  serving_start_at  TIMESTAMPTZ NOT NULL,
  serving_end_at    TIMESTAMPTZ NOT NULL,
  notes             TEXT,
  status            TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','OPEN','CLOSED','CANCELLED')),
  hostel_only       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mess_special_events_window_check
    CHECK (announcement_at < interest_deadline
           AND interest_deadline < serving_start_at
           AND serving_start_at < serving_end_at)
);
CREATE INDEX IF NOT EXISTS idx_mess_special_events_date   ON public.mess_special_events (event_date DESC);
CREATE INDEX IF NOT EXISTS idx_mess_special_events_window ON public.mess_special_events (serving_start_at, serving_end_at);

ALTER TABLE public.mess_special_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mess_special_events' AND policyname='svc_all_mess_special_events') THEN
    CREATE POLICY svc_all_mess_special_events ON public.mess_special_events FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Special items (veg / non-veg / sweet / other)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mess_special_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES public.mess_special_events(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  label       TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'VEG' CHECK (category IN ('VEG','NON_VEG','SWEET','OTHER')),
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mess_special_items_event_code_unique UNIQUE (event_id, code)
);
CREATE INDEX IF NOT EXISTS idx_mess_special_items_event ON public.mess_special_items (event_id, sort_order) WHERE is_active;

ALTER TABLE public.mess_special_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mess_special_items' AND policyname='svc_all_mess_special_items') THEN
    CREATE POLICY svc_all_mess_special_items ON public.mess_special_items FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Student interests (dynamic until the deadline; replace-set per save)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mess_special_interests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES public.mess_special_events(id) ON DELETE CASCADE,
  item_id    UUID NOT NULL REFERENCES public.mess_special_items(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mess_special_interests_unique UNIQUE (event_id, user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_mess_special_interests_event ON public.mess_special_interests (event_id, item_id);
CREATE INDEX IF NOT EXISTS idx_mess_special_interests_user  ON public.mess_special_interests (user_id, event_id);

ALTER TABLE public.mess_special_interests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mess_special_interests' AND policyname='svc_all_mess_special_interests') THEN
    CREATE POLICY svc_all_mess_special_interests ON public.mess_special_interests FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Event tokens — the QR + manual-code redemption credential
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mess_event_tokens (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         UUID NOT NULL REFERENCES public.mess_special_events(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  jti              TEXT NOT NULL UNIQUE,
  manual_code_hash TEXT NOT NULL,
  item_ids         UUID[] NOT NULL,
  item_labels      TEXT[] NOT NULL,
  issued_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ NOT NULL,
  used_at          TIMESTAMPTZ,
  used_by          UUID REFERENCES public.users(id) ON DELETE SET NULL,
  used_method      TEXT CHECK (used_method IN ('QR','MANUAL')),
  revoked_at       TIMESTAMPTZ,
  revoked_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  failed_attempts  INT NOT NULL DEFAULT 0,
  locked_until     TIMESTAMPTZ,
  sms_sent_at      TIMESTAMPTZ,
  CONSTRAINT mess_event_tokens_user_event_unique UNIQUE (user_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_mess_event_tokens_event   ON public.mess_event_tokens (event_id);
CREATE INDEX IF NOT EXISTS idx_mess_event_tokens_expires ON public.mess_event_tokens (expires_at) WHERE used_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.mess_event_tokens ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mess_event_tokens' AND policyname='svc_all_mess_event_tokens') THEN
    CREATE POLICY svc_all_mess_event_tokens ON public.mess_event_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- updated_at triggers
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='update_updated_at') THEN
    DROP TRIGGER IF EXISTS trg_mess_meal_reviews_updated_at ON public.mess_meal_reviews;
    CREATE TRIGGER trg_mess_meal_reviews_updated_at BEFORE UPDATE ON public.mess_meal_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    DROP TRIGGER IF EXISTS trg_mess_special_events_updated_at ON public.mess_special_events;
    CREATE TRIGGER trg_mess_special_events_updated_at BEFORE UPDATE ON public.mess_special_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.mess_meal_reviews, public.mess_special_events,
  public.mess_special_items, public.mess_special_interests, public.mess_event_tokens
  TO postgres, authenticated, service_role;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gate_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON
      public.mess_meal_reviews, public.mess_special_events,
      public.mess_special_items, public.mess_special_interests, public.mess_event_tokens
      TO gate_app;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Extend the audit_logs.action CHECK constraint with the new actions
--    (non-destructive: only appends values that are not already present).
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  cdef TEXT; newdef TEXT; extra TEXT;
  lit CONSTANT TEXT := '''';
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO cdef
    FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
   WHERE t.relname = 'audit_logs' AND c.conname = 'audit_logs_action_known' AND c.contype = 'c';
  IF cdef IS NULL THEN RETURN; END IF;
  IF cdef LIKE '%MESS_TOKEN_SERVED%' THEN RETURN; END IF;

  WITH candidates AS (
    SELECT v.val FROM (VALUES
      ('MESS_REVIEW_SUBMITTED'),
      ('MESS_SPECIAL_EVENT_CREATED'),
      ('MESS_SPECIAL_EVENT_UPDATED'),
      ('MESS_SPECIAL_EVENT_CANCELLED'),
      ('MESS_SPECIAL_EVENT_CLOSED'),
      ('MESS_SPECIAL_INTEREST_SAVED'),
      ('MESS_TOKEN_GENERATED'),
      ('MESS_TOKEN_VERIFIED'),
      ('MESS_TOKEN_SERVED'),
      ('MESS_TOKEN_REVOKED'),
      ('MESS_TOKEN_VERIFY_FAILED'),
      ('MESS_TOKEN_MANUAL_LOCKED'),
      ('MESS_TOKEN_SMS_SENT'),
      ('MESS_EVENT_ANNOUNCED')
    ) v(val)
  )
  SELECT string_agg(lit || a.val || lit || '::character varying', ', ' ORDER BY a.val) INTO extra
    FROM candidates a
   WHERE position(lit || a.val || lit || '::character varying' IN cdef) = 0;
  IF extra IS NULL THEN RETURN; END IF;

  newdef := replace(cdef, 'ARRAY[', 'ARRAY[' || extra || ',');
  IF newdef = cdef THEN newdef := replace(cdef, 'IN (', 'IN (' || extra || ' '); END IF;
  IF newdef = cdef THEN RETURN; END IF;

  EXECUTE 'ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_action_known';
  EXECUTE 'ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_known ' || newdef;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Migration tracking
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE has_filename BOOLEAN; has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='schema_migrations' AND column_name='filename') INTO has_filename;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='schema_migrations' AND column_name='checksum') INTO has_checksum;
  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('20261204000000', '20261204000000_mess_reviews_and_special_items.sql', NOW(), md5('20261204000000_mess_reviews_and_special_items'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261204000000', '20261204000000_mess_reviews_and_special_items.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261204000000', NOW()) ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;

COMMIT;
