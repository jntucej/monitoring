-- 20270111000002_telegram_bot_integration.sql
-- ============================================================================
-- Migration: Telegram Bot Integration
-- Tables (in telegram_bot DB, provisioned also if run directly against telegram_bot):
--   telegram_verify_codes
--   telegram_user_profiles
-- Alter users (in gate_monitor DB):
--   telegram_chat_id, telegram_user_id, telegram_verified_at, telegram_last_seen_at
-- ============================================================================

BEGIN;

-- 1. Main DB alterations (gate_monitor)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
    ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT,
      ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT,
      ADD COLUMN IF NOT EXISTS telegram_verified_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS telegram_last_seen_at TIMESTAMPTZ;

    CREATE INDEX IF NOT EXISTS idx_users_telegram_user_id
      ON public.users (telegram_user_id)
      WHERE telegram_user_id IS NOT NULL;
  END IF;
END $$;

-- 2. Telegram DB tables (if run against telegram_bot DB or a unified DB)
DO $$
BEGIN
  -- If we're connected to telegram_bot or if telegram_bot schema exists
  CREATE TABLE IF NOT EXISTS public.telegram_verify_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_unique_id TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_tg_verify_codes_lookup 
    ON public.telegram_verify_codes (user_unique_id, expires_at) 
    WHERE used_at IS NULL;

  CREATE TABLE IF NOT EXISTS public.telegram_user_profiles (
    user_unique_id TEXT PRIMARY KEY,
    telegram_chat_id BIGINT,
    telegram_user_id BIGINT,
    preferred_language TEXT DEFAULT 'en',
    bot_subscribed BOOLEAN DEFAULT false,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gate_app') THEN
    GRANT SELECT, INSERT, UPDATE ON public.telegram_verify_codes TO gate_app;
    GRANT SELECT, INSERT, UPDATE ON public.telegram_user_profiles TO gate_app;
  END IF;
END $$;

-- 3. Schema migrations tracking
DO $$
DECLARE
  has_filename BOOLEAN;
  has_checksum BOOLEAN;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='schema_migrations') THEN
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='schema_migrations' AND column_name='filename') INTO has_filename;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='schema_migrations' AND column_name='checksum') INTO has_checksum;
    IF has_filename AND has_checksum THEN
      INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
      VALUES ('20270111000002', '20270111000002_telegram_bot_integration.sql', NOW(), md5('20270111000002_telegram_bot_integration'))
      ON CONFLICT (version) DO NOTHING;
    ELSIF has_filename THEN
      INSERT INTO public.schema_migrations (version, filename, applied_at)
      VALUES ('20270111000002', '20270111000002_telegram_bot_integration.sql', NOW())
      ON CONFLICT (version) DO NOTHING;
    ELSE
      INSERT INTO public.schema_migrations (version, applied_at)
      VALUES ('20270111000002', NOW())
      ON CONFLICT (version) DO NOTHING;
    END IF;
  END IF;
END $$;

COMMIT;
