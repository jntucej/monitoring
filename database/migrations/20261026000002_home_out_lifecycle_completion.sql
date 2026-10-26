-- ============================================================================
-- 20261020000000_home_out_lifecycle_completion
-- Pass consumption tracking, amendment tracking, gate scoping, grace period,
-- extended status state machine, emergency SOS, amendment log.
-- Idempotent: every statement uses IF NOT EXISTS / IF EXISTS guards.
-- ============================================================================

BEGIN;

-- ── Pass consumption tracking ────────────────────────────────────
ALTER TABLE public.permissions
  ADD COLUMN IF NOT EXISTS used_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS used_at_gate UUID,
  ADD COLUMN IF NOT EXISTS used_at_scan UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'permissions_used_at_gate_fkey' AND table_name = 'permissions')
  THEN
    ALTER TABLE public.permissions
      ADD CONSTRAINT permissions_used_at_gate_fkey
      FOREIGN KEY (used_at_gate) REFERENCES public.gates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── Amendment tracking ───────────────────────────────────────────
ALTER TABLE public.permissions
  ADD COLUMN IF NOT EXISTS amended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS amendment_count INTEGER NOT NULL DEFAULT 0;

-- ── Gate scoping (nullable = any gate) ───────────────────────────
ALTER TABLE public.permissions
  ADD COLUMN IF NOT EXISTS allowed_gate_ids UUID[];

-- ── Grace period for duration cap ────────────────────────────────
ALTER TABLE public.config_exit_reasons
  ADD COLUMN IF NOT EXISTS grace_minutes INTEGER NOT NULL DEFAULT 60;

-- ── Extend status CHECK with EXPIRED + DISPUTED ──────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'permissions_status_check' AND table_name = 'permissions')
  THEN
    ALTER TABLE public.permissions DROP CONSTRAINT permissions_status_check;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'permission_requests_check' AND table_name = 'permissions')
  THEN
    ALTER TABLE public.permissions DROP CONSTRAINT permission_requests_check;
  END IF;
END $$;
ALTER TABLE public.permissions
  ADD CONSTRAINT permissions_status_check
  CHECK (status IN ('PENDING','APPROVED','REJECTED','ESCALATED','COMPLETED','CANCELLED','EXPIRED','DISPUTED'));

-- ── Update state machine for the new states ──────────────────────
CREATE OR REPLACE FUNCTION public.enforce_permission_transitions()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_allowed text[];
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  CASE OLD.status
    WHEN 'PENDING'   THEN v_allowed := ARRAY['APPROVED','REJECTED','ESCALATED','COMPLETED','CANCELLED','EXPIRED','DISPUTED'];
    WHEN 'ESCALATED' THEN v_allowed := ARRAY['APPROVED','REJECTED','COMPLETED','CANCELLED','EXPIRED','DISPUTED'];
    WHEN 'APPROVED'  THEN v_allowed := ARRAY['COMPLETED','CANCELLED','EXPIRED','DISPUTED'];
    WHEN 'DISPUTED'  THEN v_allowed := ARRAY['APPROVED','REJECTED','COMPLETED','CANCELLED'];
    WHEN 'REJECTED'  THEN v_allowed := ARRAY[]::text[];
    WHEN 'COMPLETED' THEN v_allowed := ARRAY[]::text[];
    WHEN 'CANCELLED' THEN v_allowed := ARRAY[]::text[];
    WHEN 'EXPIRED'   THEN v_allowed := ARRAY[]::text[];
    ELSE v_allowed := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW.status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %', OLD.status, NEW.status
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

-- Re-bind the trigger so it picks up the recreated function.
DROP TRIGGER IF EXISTS trg_permission_state_machine ON public.permissions;
CREATE TRIGGER trg_permission_state_machine
  BEFORE UPDATE OF status ON public.permissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_permission_transitions();

-- ── Emergency SOS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.emergency_sos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  message       TEXT,
  responded_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  responded_at  TIMESTAMPTZ,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_sos_open
  ON public.emergency_sos(created_at DESC) WHERE resolved_at IS NULL;

-- ── Amendment log (denormalized for fast reads) ──────────────────
CREATE TABLE IF NOT EXISTS public.permission_amendments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_id  UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  actor_id       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_role     TEXT NOT NULL,
  before_data    JSONB,
  after_data     JSONB,
  reason         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permission_amendments_ticket
  ON public.permission_amendments(permission_id, created_at DESC);

-- ── Notification read_at column (verify exists) ──────────────────
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- ── Announcement follow (idempotent) ─────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname='public' AND tablename='announcement_follows'
  ) THEN
    CREATE TABLE public.announcement_follows (
      user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      announcement_id VARCHAR(100) NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, announcement_id)
    );
  END IF;
END
$$;

COMMIT;
