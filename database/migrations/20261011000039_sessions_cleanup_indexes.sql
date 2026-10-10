-- database/migrations/20261011000039_sessions_cleanup_indexes.sql
-- Expired/revoked cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
  ON public.sessions (expires_at);

CREATE INDEX IF NOT EXISTS idx_sessions_revoked_at
  ON public.sessions (revoked_at)
  WHERE revoked_at IS NOT NULL;

-- Active session queries
CREATE INDEX IF NOT EXISTS idx_sessions_active
  ON public.sessions (user_id, expires_at DESC)
  WHERE revoked_at IS NULL;

-- Session lookup by user (dashboard shows per-user sessions)
CREATE INDEX IF NOT EXISTS idx_sessions_user_created
  ON public.sessions (user_id, created_at DESC);
