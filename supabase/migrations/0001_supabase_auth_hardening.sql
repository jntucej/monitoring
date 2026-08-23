-- ============================================================================
-- 0001_supabase_auth_hardening.sql
--
-- Additive hardening for Supabase Auth integration.
-- Safe to re-run (idempotent CREATE OR REPLACE).
--
--  1) invalidate_all_user_sessions(p_user_id)
--     Called by the application after role/status changes (and available to
--     triggers). Writes an audit trail entry and emits a pg_notify event so
--     any listeners can evict cached sessions. Actual session revocation is
--     performed by the service-role client via auth.admin.signOut().
--
--  2) resolve_login_identifier(p_login_id)
--     Extended resolver used by /api/auth/login fallbacks:
--     login_identifier -> employee_id -> email (case-insensitive on email).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Session invalidation helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invalidate_all_user_sessions(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT name INTO v_user_name FROM users WHERE id = p_user_id;

  -- Audit trail (mirrors audit_logs columns used by the application)
  INSERT INTO audit_logs (event_type, user_id, details, ip_address, "timestamp")
  VALUES (
    'SESSIONS_INVALIDATED',
    p_user_id,
    json_build_object(
      'reason', 'role_or_status_change',
      'user_name', v_user_name
    )::text,
    NULL,
    NOW()
  );

  -- Notify any listeners (e.g., realtime eviction workers)
  PERFORM pg_notify(
    'session_invalidation',
    json_build_object('user_id', p_user_id, 'timestamp', NOW())::text
  );

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invalidate_all_user_sessions failed for %: %', p_user_id, SQLERRM;
  RETURN FALSE;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Login identifier resolution (extended)
--    Order: login_identifier -> employee_id -> exact email match.
--    Returns the Supabase Auth email for sign-in, or NULL when unknown.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_login_identifier(p_login_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF p_login_id IS NULL OR btrim(p_login_id) = '' THEN
    RETURN NULL;
  END IF;

  SELECT email INTO v_email
  FROM users
  WHERE login_identifier = p_login_id
    AND status = 'ACTIVE'
  LIMIT 1;

  IF v_email IS NOT NULL THEN
    RETURN v_email;
  END IF;

  SELECT email INTO v_email
  FROM users
  WHERE employee_id = p_login_id
    AND status = 'ACTIVE'
  LIMIT 1;

  IF v_email IS NOT NULL THEN
    RETURN v_email;
  END IF;

  SELECT email INTO v_email
  FROM users
  WHERE lower(email) = lower(p_login_id)
    AND status = 'ACTIVE'
  LIMIT 1;

  RETURN v_email;
END;
$$;
