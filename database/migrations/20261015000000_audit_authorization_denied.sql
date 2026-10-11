-- Extend audit_logs action allowlist with AUTHORIZATION_DENIED so the
-- withAuthorization middleware can record privilege-escalation attempts.
DO $$
BEGIN
  ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_known;
END $$;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_action_known
  CHECK (action IN (
    'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
    'NAV_CONFIG_UPSERT', 'AUTHORIZATION_DENIED'
  ));
