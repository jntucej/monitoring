-- Unify login lockout to prevent mobile/web bypass
ALTER TABLE public.pin_login_attempts
  RENAME TO login_attempts;

ALTER TABLE public.login_attempts
  ADD COLUMN IF NOT EXISTS last_channel TEXT;

COMMENT ON TABLE public.login_attempts IS
  'Per-identifier lockout shared across all login endpoints (web, mobile, kiosk).';
