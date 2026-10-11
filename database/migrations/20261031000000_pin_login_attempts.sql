-- Create the pin_login_attempts rate-limit table used by the password/PIN
-- reset flow in PATCH /api/users/[id]. The table was referenced in code but
-- never created in any migration, causing "relation pin_login_attempts does
-- not exist" on every password change.
-- Idempotent: only creates if missing.

CREATE TABLE IF NOT EXISTS public.pin_login_attempts (
  identifier TEXT NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  PRIMARY KEY (identifier)
);

-- Index for the DELETE ... WHERE UPPER(identifier) = UPPER($1) queries
CREATE INDEX IF NOT EXISTS pin_login_attempts_identifier_upper
  ON public.pin_login_attempts (UPPER(identifier));

-- Self-record (adaptive to both 2-column and 4-column schema_migrations shapes)
DO $$
DECLARE
  has_filename BOOLEAN;
  has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='schema_migrations' AND column_name='filename')
  INTO has_filename;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='schema_migrations' AND column_name='checksum')
  INTO has_checksum;

  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('20261031000000', '20261031000000_pin_login_attempts.sql', NOW(),
            md5('20261031000000_pin_login_attempts'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('20261031000000', '20261031000000_pin_login_attempts.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('20261031000000', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END
$$;
