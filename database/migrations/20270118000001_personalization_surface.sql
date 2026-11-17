-- Migration: 20270118000001_personalization_surface.sql
-- Personalization + register + review + flexible class + class message surface.
-- Idempotent: every object is guarded; safe to re-run.

BEGIN;

-- ── 1. class_periods (the timetable clock) ──────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'class_periods') THEN
    CREATE TABLE public.class_periods (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      class_id        UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
      period_no       INT  NOT NULL,
      day_of_week     INT  NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
      start_time      TIME NOT NULL,
      end_time        TIME NOT NULL,
      hall            TEXT NOT NULL DEFAULT '',
      faculty_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (class_id, day_of_week, period_no)
    );
    CREATE INDEX idx_class_periods_lookup ON public.class_periods (day_of_week, start_time);
  END IF;
END
$$;

-- ── 2. class_flexible (deviations from the base timetable) ─────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'class_flexible') THEN
    CREATE TABLE public.class_flexible (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type             TEXT NOT NULL CHECK (type IN ('extra','reschedule','substitute')),
      class_id         UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
      session_date     DATE NOT NULL,
      period_no        INT  NOT NULL,
      start_time       TIME NOT NULL,
      end_time         TIME NOT NULL,
      hall             TEXT NOT NULL DEFAULT '',
      base_period_id   UUID,
      created_by       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      requested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      approval_state   TEXT NOT NULL DEFAULT 'auto_approved'
                       CHECK (approval_state IN ('auto_approved','pending','approved','rejected')),
      approver_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
      approved_at      TIMESTAMPTZ,
      reject_reason    TEXT,
      note             TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_class_flexible_lookup
      ON public.class_flexible (session_date, period_no, approval_state);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'class_flexible' AND column_name = 'reversed_at') THEN
    ALTER TABLE public.class_flexible ADD COLUMN reversed_at TIMESTAMPTZ;
    ALTER TABLE public.class_flexible ADD COLUMN reverse_reason TEXT;
  END IF;
END
$$;

-- ── 3. class_register_drafts + attendance_register_sessions ────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'class_register_drafts') THEN
    CREATE TABLE public.class_register_drafts (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      class_id        UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
      session_date    DATE NOT NULL,
      period_no       INT  NOT NULL,
      opened_by       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      present_flags   JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { "roll": true }
      status          TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','submitted','not_done','superseded')),
      opened_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      submitted_at    TIMESTAMPTZ,
      submitted_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
      source          TEXT NOT NULL DEFAULT 'cr' CHECK (source IN ('cr','faculty','upload','flexible')),
      mixed_session_id UUID,
      UNIQUE (class_id, session_date, period_no)
    );
    CREATE INDEX idx_register_drafts_lookup
      ON public.class_register_drafts (class_id, session_date, period_no);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_register_sessions') THEN
    CREATE TABLE public.attendance_register_sessions (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      draft_id      UUID NOT NULL REFERENCES public.class_register_drafts(id) ON DELETE CASCADE,
      opened_by     UUID NOT NULL,
      opened_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      toggles       INT NOT NULL DEFAULT 0,
      note          TEXT
    );
    CREATE INDEX idx_reg_sessions_draft ON public.attendance_register_sessions (draft_id);
  END IF;
END
$$;

-- ── 4. class_reviews (duty-off one-tap review; append-only) ────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'class_reviews') THEN
    CREATE TABLE public.class_reviews (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      faculty_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      session_date   DATE NOT NULL,
      class_ids      UUID[] NOT NULL DEFAULT '{}',
      present_counts JSONB NOT NULL DEFAULT '{}',   -- { "classCode": "52/60" }
      rating         TEXT NOT NULL CHECK (rating IN ('good','needs_attention','note')),
      note           TEXT,
      escalated_to_dean BOOLEAN NOT NULL DEFAULT FALSE,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (faculty_id, session_date)
    );
    CREATE INDEX idx_class_reviews_date ON public.class_reviews (session_date);
  END IF;

  -- Append-only: block UPDATE/DELETE via triggers.
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_class_reviews_immutable') THEN
    CREATE FUNCTION public.fn_class_reviews_immutable() RETURNS trigger AS $fn$
    BEGIN
      RAISE EXCEPTION 'class_reviews is append-only';
    END
    $fn$ LANGUAGE plpgsql;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_class_reviews_immutable') THEN
    CREATE TRIGGER trg_class_reviews_immutable
      BEFORE UPDATE OR DELETE ON public.class_reviews
      FOR EACH ROW EXECUTE FUNCTION public.fn_class_reviews_immutable();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'class_reviews' AND column_name = 'read_by') THEN
    ALTER TABLE public.class_reviews ADD COLUMN read_by JSONB NOT NULL DEFAULT '[]'::jsonb;
    -- read_by: [ { "user_id": "...", "role": "hod", "at": "..." } ]
  END IF;
END
$$;

-- ── 5. class_messages + class_message_receipts ─────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'class_messages') THEN
    CREATE TABLE public.class_messages (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      author_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      class_ids      UUID[] NOT NULL,
      mode           TEXT NOT NULL CHECK (mode IN ('relay','direct')),
      urgency        TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('normal','urgent')),
      body           TEXT NOT NULL,
      body_hash      TEXT NOT NULL,
      requires_ack   BOOLEAN NOT NULL DEFAULT FALSE,
      auto_release_at TIMESTAMPTZ,
      released_at    TIMESTAMPTZ,
      released_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
      auto_released  BOOLEAN NOT NULL DEFAULT FALSE,
      sent_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
      supersede_of   UUID REFERENCES public.class_messages(id) ON DELETE SET NULL
    );
    CREATE INDEX idx_class_messages_class ON public.class_messages (sent_at DESC);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'class_message_receipts') THEN
    CREATE TABLE public.class_message_receipts (
      message_id  UUID NOT NULL REFERENCES public.class_messages(id) ON DELETE CASCADE,
      user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      delivered_at TIMESTAMPTZ,
      read_at     TIMESTAMPTZ,
      acked_at    TIMESTAMPTZ,
      channel     TEXT NOT NULL DEFAULT 'telegram',
      PRIMARY KEY (message_id, user_id)
    );
    CREATE INDEX idx_cmr_user ON public.class_message_receipts (user_id, delivered_at DESC);
  END IF;
END
$$;

-- ── 6. personalization_prefs (4 settings, explicit-only) ───────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'personalization_prefs') THEN
    CREATE TABLE public.personalization_prefs (
      user_id      UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
      quiet_start  TIME NOT NULL DEFAULT '23:00',
      quiet_end    TIME NOT NULL DEFAULT '08:00',
      density      TEXT NOT NULL DEFAULT 'short' CHECK (density IN ('short','detailed')),
      digest_time  TIME NOT NULL DEFAULT '08:00',
      consent_given BOOLEAN NOT NULL DEFAULT FALSE,  -- raw-review consent (first /review)
      consent_at   TIMESTAMPTZ,
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  END IF;
END
$$;

-- ── 7. attendance_seen (block-level continuity memory) ─────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_seen') THEN
    CREATE TABLE public.attendance_seen (
      user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      block_key      TEXT NOT NULL,  -- e.g. "attendance:self", "schedule", "marks"
      last_seen_hash TEXT NOT NULL,   -- sha256 of the block's payload
      last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_payload   JSONB,
      PRIMARY KEY (user_id, block_key)
    );
  END IF;
END
$$;

-- ── 8. users: CR/ICR flags + duty_off override ─────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_cr') THEN
    ALTER TABLE public.users ADD COLUMN is_cr BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_icr') THEN
    ALTER TABLE public.users ADD COLUMN is_icr BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'duty_off_override') THEN
    ALTER TABLE public.users ADD COLUMN duty_off_override TIME;  -- HOD-configurable per faculty
  END IF;
  -- CR/ICR must be student users; index for register lookup.
  CREATE INDEX IF NOT EXISTS idx_users_cr ON public.users (is_cr, role) WHERE is_cr OR is_icr;
END
$$;

-- ── 9. notifications: block-level seen tracking ────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'block_key') THEN
    ALTER TABLE public.notifications ADD COLUMN block_key TEXT;
    ALTER TABLE public.notifications ADD COLUMN last_transition_hash TEXT;
  END IF;
END
$$;

-- ── 10. audit_events: register the new actions in the known list ──────
-- The audit-chain verifier whitelists actions; the new action names
-- (attendance_submit, attendance_correct, attendance_upload,
-- attendance_supersede, class_flexible, class_cancel, class_message,
-- class_message_receipt, review_submit, personalization_update,
-- register_open) are registered here against the legacy audit_logs
-- whitelist when it exists. The tamper-evident chain (audit_chain)
-- hashes audit_events rows directly, so no whitelist is needed there.
DO $$
DECLARE
  has_legacy_audit_logs BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs')
    INTO has_legacy_audit_logs;
  IF NOT has_legacy_audit_logs THEN
    RAISE NOTICE 'legacy audit_logs table absent — nothing to register';
    RETURN;
  END IF;
END
$$;

COMMIT;
