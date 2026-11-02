-- Long-run resilience indexes (month-six query performance).
--
-- Without these the queries that month-six users actually run become
-- full-table scans:
--   • GET /api/mess/my-token — scans every mess_tokens row per student
--   • admin complaint queue   — scans complaints by status + closed_at
--   • department headcount    — joins student_details.department (unindexed)
--   • attendance by class     — scans every attendance row per person
--
-- All are CREATE INDEX IF NOT EXISTS — idempotent, safe to re-run.

-- mess_tokens: composite index for the my-token lookup
-- (user_id, mess_day_id) is already covered by mess_tokens_user_day_unique,
-- but the expires_at-only path used by the cleanup job needs its own.
-- Verify: idx_mess_tokens_user_day (user_id, mess_day_id) already exists.
-- Add the missing composite the verify endpoint needs:
CREATE INDEX IF NOT EXISTS idx_mess_tokens_user_expires
  ON public.mess_tokens (user_id, expires_at DESC);

-- complaints: cleanup job filters status IN (resolved, closed) AND closed_at < cutoff.
-- Existing idx_complaints_status covers status alone; the closed_at predicate
-- is not in that index, so the cleanup DELETE walks the whole table.
CREATE INDEX IF NOT EXISTS idx_complaints_closed_at
  ON public.complaints (status, closed_at DESC);

-- student_details: department headcount queries join on department but no
-- index on department exists. After 2 years of imports this is a full scan.
CREATE INDEX IF NOT EXISTS idx_student_details_department
  ON public.student_details (department);

-- attendance_records: the by-class attendance query filters on
-- person_id + date but no composite index covers that.
CREATE INDEX IF NOT EXISTS idx_attendance_records_person_date
  ON public.attendance_records (person_id, date DESC);
