-- database/migrations/20261016000000_restore_login_attempts.sql
CREATE TABLE IF NOT EXISTS public.login_attempts (
  identifier      TEXT PRIMARY KEY,
  failed_count    INTEGER NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_channel    TEXT
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_locked
  ON public.login_attempts (locked_until)
  WHERE locked_until IS NOT NULL;

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'login_attempts'
      AND policyname = 'service_role_all_login_attempts'
  ) THEN
    CREATE POLICY "service_role_all_login_attempts"
      ON public.login_attempts
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;
