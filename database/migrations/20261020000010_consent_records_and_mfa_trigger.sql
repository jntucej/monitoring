SET lock_timeout = '5s';
SET statement_timeout = '60s';

BEGIN;

CREATE TABLE IF NOT EXISTS public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  version TEXT NOT NULL DEFAULT '1.0'
);

CREATE INDEX IF NOT EXISTS idx_consent_records_user  ON public.consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_scope ON public.consent_records(scope);

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
CREATE INDEX IF NOT EXISTS idx_idempotency_expires_at    ON public.idempotency_keys(expires_at);

-- No-op placeholder. The guarded implementation is installed by
-- 20261201000001_fix_mfa_privileged_trigger.sql, which reads the
-- `mfaRequiredForAdmin` system setting before enforcing.
CREATE OR REPLACE FUNCTION public.reject_privileged_without_mfa()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

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
