-- 20270108000000_compensating_controls_m1_m2_m5_m6.sql
--
-- Batch M — Compensating controls (no MFA). One migration, ordered by
-- blast radius: M1 (step-up marker + device binding), M2 (privileged-alert
-- schema), M5 (operator_actions + auto_policies extension), M6 (IP
-- allowlist column). Deployment order M1→M4→M5→M6 is enforced by the
-- ordering inside this file: later controls read earlier columns.
BEGIN;
--
-- ── M1: step-up marker + device binding ──────────────────────────────────
-- sessions.step_up_at: last time the holder re-entered their password.
-- A NULL means the session has never been stepped up. A fresh step-up
-- (< 5 min) is required before any destructive route runs.
--
-- sessions.device_hash: SHA-256 of the `device_id` cookie set at login.
-- Every authenticated request must present the same hash; a stolen
-- access_token alone (without the cookie) is rejected.
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS step_up_at TIMESTAMPTZ;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS device_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_sessions_device_hash
  ON public.sessions (device_hash) WHERE device_hash IS NOT NULL;

-- ── M2: privileged login alert lock token ───────────────────────────────
-- The "this wasn't me" link in the privileged login alert is an
-- HMAC-signed, 24-hour one-use token. The lock route (POST /api/auth/lock)
-- verifies it and revokes all sessions + bumps session_version.
CREATE TABLE IF NOT EXISTS public.privileged_login_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id      UUID,
  ip              TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lock_token_hash TEXT,
  lock_used_at    TIMESTAMPTZ,
  lock_used_by    UUID REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_privileged_login_alerts_user
  ON public.privileged_login_alerts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_privileged_login_alerts_lock_token
  ON public.privileged_login_alerts (lock_token_hash) WHERE lock_token_hash IS NOT NULL;

-- ── M5: operator_actions + auto_policies extension ──────────────────────
-- Add the dangerous action kinds that were previously "execute on call".
-- Nothing else changes: the existing pending/approved/executed lifecycle
-- already supports them.
INSERT INTO public.auto_policies (action_kind, execution_mode, max_attempts, cooldown_minutes, min_confidence)
VALUES
  ('delete_user',            'approve', 1, 0, 1.0),
  ('change_user_role',       'approve', 1, 0, 1.0),
  ('revoke_all_sessions',    'approve', 1, 0, 1.0),
  ('drop_table',             'approve', 1, 0, 1.0),
  ('disable_kill_switch',    'approve', 1, 0, 1.0),
  ('rotate_db_credentials',  'approve', 1, 0, 1.0),
  ('grant_sysadmin',         'approve', 2, 0, 1.0)
ON CONFLICT (action_kind) DO UPDATE
  SET execution_mode   = EXCLUDED.execution_mode,
      max_attempts     = EXCLUDED.max_attempts,
      cooldown_minutes = EXCLUDED.cooldown_minutes,
      min_confidence   = EXCLUDED.min_confidence;

-- ── M6: IP allowlist column ─────────────────────────────────────────────
-- users.allowed_cidrs: TEXT[] of CIDR ranges from which this user may
-- authenticate. NULL = no restriction. Enforced only when
-- IP_ALLOWLIST_ENFORCED=true (default off, safe to deploy day one).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS allowed_cidrs TEXT[];

COMMENT ON COLUMN public.users.allowed_cidrs IS
  'CIDR ranges from which this user may authenticate. NULL = no restriction. '
  'Only enforced when IP_ALLOWLIST_ENFORCED=true.';

COMMIT;
