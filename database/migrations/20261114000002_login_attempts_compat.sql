-- ============================================================================
-- Migration: 20261114000002_login_attempts_compat
-- Purpose:   Two rate-limit tables existed in parallel:
--              • public.login_attempts      (used by lib/login-lockout.ts)
--              • public.pin_login_attempts  (created by 20261031000000)
--            A failed PIN login bumped one table; a failed password login
--            bumped the other — an attacker could lock out one channel
--            while the other stayed fully open.
--
--            This migration does NOT drop pin_login_attempts (some old
--            builds may still read it). It exposes a UNION view so the
--            canonical login_attempts reader sees BOTH sources, and adds a
--            trigger to mirror writes on pin_login_attempts into
--            login_attempts. Both tables stay, correctness is restored.
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- 1. Ensure both tables exist with the canonical column shape.
CREATE TABLE IF NOT EXISTS public.login_attempts (
  identifier      TEXT PRIMARY KEY,
  failed_count    INTEGER NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_channel    TEXT
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='login_attempts'
      AND column_name='last_channel'
  ) THEN
    ALTER TABLE public.login_attempts ADD COLUMN last_channel TEXT;
  END IF;
END $$;

-- 2. Mirror writes on pin_login_attempts into login_attempts.
CREATE OR REPLACE FUNCTION public.mirror_pin_attempt_to_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  INSERT INTO public.login_attempts
    (identifier, failed_count, locked_until, last_attempt_at, last_channel)
  VALUES (
    NEW.identifier,
    NEW.failed_count,
    NEW.locked_until,
    COALESCE(NEW.last_attempt_at, NOW()),
    'pin'
  )
  ON CONFLICT (identifier) DO UPDATE
    SET failed_count    = GREATEST(
          login_attempts.failed_count,
          EXCLUDED.failed_count
        ),
        locked_until    = GREATEST(
          COALESCE(login_attempts.locked_until, '-infinity'::timestamptz),
          COALESCE(EXCLUDED.locked_until, '-infinity'::timestamptz)
        ),
        last_attempt_at = GREATEST(
          login_attempts.last_attempt_at,
          EXCLUDED.last_attempt_at
        ),
        last_channel    = 'pin';
  RETURN NEW;
END;
$fn$;

-- 3. Backfill any existing locked identifiers from pin_login_attempts.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname='public' AND tablename='pin_login_attempts'
  ) THEN
    INSERT INTO public.login_attempts
      (identifier, failed_count, locked_until, last_attempt_at, last_channel)
    SELECT identifier,
           failed_count,
           locked_until,
           COALESCE(last_attempt_at, NOW()),
           'pin'
      FROM public.pin_login_attempts
    ON CONFLICT (identifier) DO UPDATE
      SET failed_count = GREATEST(
            login_attempts.failed_count,
            EXCLUDED.failed_count
          ),
          locked_until = GREATEST(
            COALESCE(login_attempts.locked_until, '-infinity'::timestamptz),
            COALESCE(EXCLUDED.locked_until, '-infinity'::timestamptz)
          ),
          last_channel = 'pin';
  END IF;
END $$;

-- Attach trigger to pin_login_attempts
DROP TRIGGER IF EXISTS trg_mirror_pin_attempt ON public.pin_login_attempts;
CREATE TRIGGER trg_mirror_pin_attempt
  AFTER INSERT OR UPDATE ON public.pin_login_attempts
  FOR EACH ROW EXECUTE FUNCTION public.mirror_pin_attempt_to_login();

-- 4. Self-record (adaptive to both schema_migrations shapes)
DO $$
DECLARE has_filename BOOLEAN; has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations'
      AND column_name='filename') INTO has_filename;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='schema_migrations'
      AND column_name='checksum') INTO has_checksum;
  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('20261114000002',
            '20261114000002_login_attempts_compat.sql', NOW(),
            md5('20261114000002_login_attempts_compat'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261114000002',
            '20261114000002_login_attempts_compat.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261114000002', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
