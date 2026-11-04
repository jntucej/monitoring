-- Part 6 — Session / Refresh Token Lifecycle
--
-- 1. family_id: every refresh-token rotation inherits the family of its
--    parent. A fresh family is created at login (default gen_random_uuid()).
--    Revoking the family kills every live token in the lineage.
-- 2. parent_id: traceability of the rotation chain (which row produced this
--    row).
-- 3. successor_hash: the hash of the NEXT refresh token, written onto the
--    old row after rotation. Lets a stale tab that re-presents the old
--    token within the grace window be recognized as a legitimate race
--    instead of a theft.
--
-- NOTE: the existing row-per-token model is preserved (refresh_hash UNIQUE).
-- The session_family model adds lineage without breaking any existing code
-- paths; it is consumed by /api/auth/refresh and /api/auth/logout.

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS family_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rotated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS successor_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_sessions_family_live
  ON public.sessions (family_id) WHERE revoked_at IS NULL;
-- (idx_sessions_refresh_hash already exists; the live-only variant is covered
--  by idx_sessions_active_user for the user dimension.)

-- Audit actions for the reuse path. The audit_logs_action_known CHECK is
-- extended (idempotent) to accept the new actions without breaking
-- audit-log writes. Each action is inserted at the head of the ARRAY
-- literal only if not already present, so the block is safe to replay.
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

  IF cdef IS NOT NULL THEN
    IF position('REFRESH_ROTATED' IN cdef) = 0 THEN
      cdef := replace(cdef, 'ARRAY[',
        "ARRAY['REFRESH_ROTATED'::character varying, ");
    END IF;
    IF position('REFRESH_REUSE_DETECTED' IN cdef) = 0 THEN
      cdef := replace(cdef, 'ARRAY[',
        "ARRAY['REFRESH_REUSE_DETECTED'::character varying, ");
    END IF;
    IF position('REFRESH_FAMILY_REVOKED' IN cdef) = 0 THEN
      cdef := replace(cdef, 'ARRAY[',
        "ARRAY['REFRESH_FAMILY_REVOKED'::character varying, ");
    END IF;
    IF position('SESSION_FAMILY_CREATED' IN cdef) = 0 THEN
      cdef := replace(cdef, 'ARRAY[',
        "ARRAY['SESSION_FAMILY_CREATED'::character varying, ");
    END IF;
    EXECUTE 'ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_known';
    EXECUTE 'ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_known ' || cdef;
  END IF;
END $$;
