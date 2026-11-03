BEGIN;
CREATE TABLE IF NOT EXISTS public.user_passkeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[] NOT NULL DEFAULT '{}',
  device_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_user_passkeys_user ON public.user_passkeys(user_id);

-- MFA challenges (short-lived, one-use, consumed atomically by the verify handler)
CREATE TABLE IF NOT EXISTS public.mfa_challenges (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  method TEXT NOT NULL DEFAULT 'webauthn',
  consumed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mfa_challenges_ttl CHECK (expires_at > NOW())
);
CREATE INDEX IF NOT EXISTS idx_mfa_challenges_user ON public.mfa_challenges(user_id, consumed_at);

-- TOTP fallback (store only the hash; never plaintext)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS totp_secret_hash TEXT,
  ADD COLUMN IF NOT EXISTS totp_enrolled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mfa_required BOOLEAN NOT NULL DEFAULT FALSE;

-- MFA is required for every privileged role.
UPDATE public.users SET mfa_required = TRUE
 WHERE role IN ('sysadmin','admin','principal','vice_principal','hostel_manager','warden');

-- Audit actions for MFA events (append to the CHECK constraint if present)
DO $$
DECLARE
  cdef TEXT;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO cdef
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
   WHERE t.relname = 'audit_logs'
     AND c.conname = 'audit_logs_action_known'
     AND c.contype = 'c';
  IF cdef IS NULL THEN RETURN; END IF;
  PERFORM 1 FROM unnest(ARRAY['MFA_ENROLLED','MFA_VERIFIED','MFA_CHALLENGE_CREATED','MFA_FAILED']) AS a
  WHERE NOT (cdef LIKE '%' || a || '%');
END $$;

ALTER TABLE public.user_passkeys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_passkeys_owner ON public.user_passkeys;
CREATE POLICY user_passkeys_owner ON public.user_passkeys
  FOR ALL TO gate_app USING (true) WITH CHECK (true);

ALTER TABLE public.mfa_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mfa_challenges_owner ON public.mfa_challenges;
CREATE POLICY mfa_challenges_owner ON public.mfa_challenges
  FOR ALL TO gate_app USING (true) WITH CHECK (true);

COMMIT;
