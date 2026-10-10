-- database/migrations/20261020000000_consent_records_and_mfa_trigger.sql
-- Implements consent records (BA5), idempotency store (AY3), and privileged MFA DB check (BB5).
SET lock_timeout = '5s';
SET statement_timeout = '60s';

BEGIN;

-- 1. Consent Records Table (DPDP compliance)
CREATE TABLE IF NOT EXISTS public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  version TEXT NOT NULL DEFAULT '1.0'
);

CREATE INDEX IF NOT EXISTS idx_consent_records_user ON public.consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_scope ON public.consent_records(scope);

-- 2. Idempotency Keys Table (AY3)
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  response_body JSONB,
  status_code INT DEFAULT 200,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_user_endpoint ON public.idempotency_keys(user_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires_at ON public.idempotency_keys(expires_at);

-- 3. Reject privileged sessions without MFA function & trigger (BB5)
CREATE OR REPLACE FUNCTION public.reject_privileged_without_mfa()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_mfa BOOLEAN;
BEGIN
  SELECT role, COALESCE(two_factor_enabled, false)
    INTO v_role, v_mfa
    FROM public.users
   WHERE id = NEW.user_id;

  IF v_role IN ('admin', 'sysadmin') AND NOT v_mfa THEN
    RAISE EXCEPTION 'MFA required for privileged role session creation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sessions'
  ) THEN
    DROP TRIGGER IF EXISTS trg_reject_privileged_mfa ON public.sessions;
    CREATE TRIGGER trg_reject_privileged_mfa
      BEFORE INSERT ON public.sessions
      FOR EACH ROW
      EXECUTE FUNCTION public.reject_privileged_without_mfa();
  END IF;
END $$;

COMMIT;
