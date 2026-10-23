-- ============================================================================
-- 20261020000002_mess_review_hardening
-- R4 (edit/retract), R6 (mess-incharge reply), R10 (admin delete) support columns;
-- partial index for the "active reviews" hot path; reply + digest-log tables.
-- ============================================================================

BEGIN;

-- Edit / retract / soft-delete audit columns.
ALTER TABLE public.mess_meal_reviews
  ADD COLUMN IF NOT EXISTS edited_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edit_count     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS served_at_gate_check TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS flagged_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS flag_reason    TEXT;

-- Hot path: "today's active reviews by meal".
CREATE INDEX IF NOT EXISTS idx_mess_reviews_date_meal_active
  ON public.mess_meal_reviews (review_date DESC, meal_type)
  WHERE deleted_at IS NULL;

-- Mess-incharge reply (R6) — one-way thread under a review.
CREATE TABLE IF NOT EXISTS public.mess_review_replies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id     UUID NOT NULL REFERENCES public.mess_meal_reviews(id) ON DELETE CASCADE,
  replier_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  replier_role  TEXT NOT NULL,
  body          TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mess_review_replies_review
  ON public.mess_review_replies (review_id, created_at DESC);

-- Digest log — one row per day; prevents double-sending the low-satisfaction
-- alert (R5 cron).
CREATE TABLE IF NOT EXISTS public.mess_review_digest_log (
  digest_date DATE PRIMARY KEY,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
