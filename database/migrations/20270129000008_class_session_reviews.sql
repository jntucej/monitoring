-- 20270129000008_class_session_reviews.sql
--
-- Student-per-session class reviews, attributed to a specific faculty's
-- specific class session (the derived classSession from src/lib/class-session.ts).
--
-- This is DISTINCT from the existing public.class_reviews table, which is a
-- faculty-LEVEL day aggregate (unique faculty_id + session_date, rating
-- good/needs_attention/note) driven by the faculty-review cron. This table is
-- the student's per-session review, keyed by the deterministic session id.
--
-- One review per (student, session) — enforced by the unique constraint so a
-- student who attended session X can submit exactly one review for X.

CREATE TABLE IF NOT EXISTS public.class_session_reviews (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- the derived session this review is about
  session_id         TEXT NOT NULL,
  class_id           UUID NOT NULL,
  subject_code       TEXT,
  faculty_id         UUID NOT NULL,            -- via teaching-binding at session creation
  session_date       DATE NOT NULL,
  period             INTEGER NOT NULL,
  -- the student filing it (NULL when anonymous)
  student_id         UUID,
  is_anonymous       BOOLEAN NOT NULL DEFAULT FALSE,
  -- the review itself
  rating             INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- one review per student per session
  UNIQUE (student_id, session_id)
);

-- Reviews are attributed to a faculty; the faculty dashboard queries by
-- faculty_id + date range.
CREATE INDEX IF NOT EXISTS idx_class_session_reviews_faculty
  ON public.class_session_reviews (faculty_id, session_date DESC);

-- The aggregate/summary + trends queries filter by session + rating.
CREATE INDEX IF NOT EXISTS idx_class_session_reviews_session
  ON public.class_session_reviews (session_id);

COMMENT ON TABLE public.class_session_reviews
  IS 'Student-per-session class reviews, attributed to a faculty via the derived class session. Distinct from the faculty-level public.class_reviews day aggregate.';

-- ── class.next reminder dedupe marker ────────────────────────────────────────
-- One row per (student, session) so the class-reminders cron nudes a student
-- at most once per session. Tiny + bounded (prune old rows via the cron's
-- retention, or leave — it is low-volume).
CREATE TABLE IF NOT EXISTS public.class_next_markers (
  user_id    UUID NOT NULL,
  session_id TEXT NOT NULL,
  class_id   UUID NOT NULL,
  period     INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, session_id)
);
CREATE INDEX IF NOT EXISTS idx_class_next_markers_session ON public.class_next_markers (session_id);

-- ── class.review.prompt dedupe marker ────────────────────────────────────────
-- One row per (student, session) so the review-prompt cron nudges a student
-- at most once per ended session.
CREATE TABLE IF NOT EXISTS public.class_review_prompt_markers (
  user_id    UUID NOT NULL,
  session_id TEXT NOT NULL,
  class_id   UUID NOT NULL,
  period     INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, session_id)
);
CREATE INDEX IF NOT EXISTS idx_class_review_prompt_markers_session
  ON public.class_review_prompt_markers (session_id);


-- ── class-session marker (session_id → timetable components) ───────────────
-- The derived session id is a hash; to inverse it (review endpoint, prompt
-- flow) we record the components that produced it. Written by the
-- class-review-prompt cron for every ended session, so a student's review
-- always resolves to the (class, period, faculty) it belongs to.
CREATE TABLE IF NOT EXISTS public.class_session_markers (
  session_id   TEXT PRIMARY KEY,
  class_id     UUID NOT NULL,
  period       INTEGER NOT NULL,
  faculty_id   UUID,
  session_date DATE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
