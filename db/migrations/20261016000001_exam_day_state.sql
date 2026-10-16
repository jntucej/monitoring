-- 20261016000001_exam_day_state.sql
-- Exam-day gate state + exceptions, backing the OIE day-access command and
-- the exam_superintendent IncidentPanel. Minimal: one current-state row per
-- day (keyed by the local calendar date) and one exceptions ledger.

CREATE TABLE IF NOT EXISTS exam_day_state (
  day              DATE PRIMARY KEY,
  access_state     TEXT NOT NULL DEFAULT 'closed' CHECK (access_state IN ('open','closed')),
  updated_by       UUID,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_access_exceptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day          DATE NOT NULL,
  severity     TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('critical','warning','info')),
  candidate    TEXT,
  roll         TEXT,
  hall         TEXT,
  description  TEXT,
  resolved     BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exam_exceptions_day ON exam_access_exceptions (day, resolved);
