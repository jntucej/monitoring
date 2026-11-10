-- 20270111000001_telegram_deep_links.sql
-- ============================================================================
-- Telegram deep-link enrollment verification (primary identity check).
--
-- Two-step flow:
--   1. Candidate taps `t.me/<bot>?start=<TOKEN>` → Telegram's `/start`
--      proves control of a Telegram account.
--   2. Bot asks the candidate to share their phone number (contact
--      button). The candidate's own contact card must satisfy BOTH:
--        a. contact.user_id === message.from.id  (not a forwarded
--           contact — Telegram can confirm this; a forwarded card has a
--           different user_id and must be rejected outright)
--        b. normalized phone number matches users.phone exactly
--      (digits-only compare; country-code formats normalize to the same
--      digit string when both sides carry a + prefix).
--   Hard gate: mismatch or forwarded card → verification FAILED, no
--   verification recorded, candidate is directed to the admin.
--
-- The token is one-time, short-lived, stored as SHA-256 hash at rest.
--
-- Changes:
--   1. users.telegram_chat_id / telegram_user_id / telegram_verified_at
--      / telegram_verification_failed_at
--   2. telegram_deep_links table (token_hash UNIQUE, expires_at, used_at)
--   3. enrollment_codes purpose 'web_bootstrap_tg'
--   4. audit actions TELEGRAM_DEEP_LINK_ISSUED / _VERIFIED / _FAILED
-- ============================================================================

BEGIN;

-- ── 1. users: telegram identity columns ─────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT,
  ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT,
  ADD COLUMN IF NOT EXISTS telegram_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS telegram_verification_failed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_telegram_chat
  ON public.users (telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;

-- ── 2. telegram_deep_links table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.telegram_deep_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  telegram_user_id BIGINT,
  telegram_chat_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_deep_links_user
  ON public.telegram_deep_links (user_id, expires_at)
  WHERE used_at IS NULL;

-- RLS: ENABLE + FORCE, same pattern as enrollment_codes. The service
-- account gets FULL access via a dedicated policy; all application
-- access goes through gate_app, which is forced to stay inside its
-- policy context even if a developer drops SET ROLE.
ALTER TABLE public.telegram_deep_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_deep_links FORCE ROW LEVEL SECURITY;

-- Idempotency: Telegram retries non-2xx updates. Deduplicate on
-- update_id for 48h so a retried /start or contact update cannot
-- double-verify a candidate.
CREATE TABLE IF NOT EXISTS public.telegram_webhook_dedupe (
  update_id BIGINT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tg_webhook_dedupe_expires
  ON public.telegram_webhook_dedupe (processed_at);

GRANT INSERT, SELECT ON public.telegram_webhook_dedupe TO gate_app;

ALTER TABLE public.telegram_webhook_dedupe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_webhook_dedupe FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='telegram_webhook_dedupe'
      AND policyname='service_role_all_tg_webhook_dedupe'
  ) THEN
    CREATE POLICY "service_role_all_tg_webhook_dedupe"
      ON public.telegram_webhook_dedupe
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='telegram_deep_links'
      AND policyname='service_role_all_telegram_deep_links'
  ) THEN
    CREATE POLICY "service_role_all_telegram_deep_links"
      ON public.telegram_deep_links
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_deep_links TO gate_app;
GRANT USAGE ON SCHEMA public TO gate_app;

-- ── 3. enrollment_codes: allow 'web_bootstrap_tg' purpose ───────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'enrollment_codes_purpose_check'
      AND conrelid = 'public.enrollment_codes'::regclass
  ) THEN
    ALTER TABLE public.enrollment_codes
      DROP CONSTRAINT enrollment_codes_purpose_check;
  END IF;
END $$;

ALTER TABLE public.enrollment_codes
  ADD CONSTRAINT enrollment_codes_purpose_check
  CHECK (purpose = ANY (ARRAY[
    'mobile'::text,
    'web'::text,
    'web_bootstrap'::text,
    'web_bootstrap_tg'::text,
    'pin_reset'::text,
    'role_bootstrap'::text
  ]));

-- ── 4. audit actions (non-destructive append) ───────────────────────────────
DO $$
DECLARE
  cdef TEXT;
  newdef TEXT;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO cdef
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
   WHERE t.relname = 'audit_logs'
     AND c.conname = 'audit_logs_action_known'
     AND c.contype = 'c';
  IF cdef IS NULL THEN RETURN; END IF;
  IF cdef LIKE '%TELEGRAM_DEEP_LINK_ISSUED%' THEN RETURN; END IF;

  WITH candidates AS (
    SELECT v.val FROM (VALUES
      ('TELEGRAM_DEEP_LINK_ISSUED'),
      ('TELEGRAM_DEEP_LINK_VERIFIED'),
      ('TELEGRAM_DEEP_LINK_FAILED'),
      ('TELEGRAM_DEEP_LINK_REPLAYED')
    ) AS v(val)
    WHERE NOT (cdef LIKE '%' || v.val || '%')
  )
  SELECT COALESCE(string_agg('''' || val || '''', ', '), '') INTO newdef
    FROM candidates;

  IF newdef IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.audit_logs
      DROP CONSTRAINT IF EXISTS audit_logs_action_known,
      ADD CONSTRAINT audit_logs_action_known
        CHECK (action = ANY (ARRAY[' ||
             (SELECT string_agg(m, ', ') FROM
                (SELECT trim(both '''' FROM unnest(regexp_matches(cdef, '\((.*)\)', 'g')) AS u)
                 CROSS JOIN LATERAL unnest(string_to_array(u, ', ')) AS m) sub)
             || ', ' || newdef || '])'
      ;
  END IF;
END $$;

-- ── 5. schema_migrations registration ───────────────────────────────────────
DO $$
DECLARE
  has_filename BOOLEAN;
  has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='schema_migrations' AND column_name='filename') INTO has_filename;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='schema_migrations' AND column_name='checksum') INTO has_checksum;
  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('20270111000001', '20270111000001_telegram_deep_links.sql', NOW(), md5('20270111000001_telegram_deep_links'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20270111000001', '20270111000001_telegram_deep_links.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20270111000001', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;

COMMIT;
