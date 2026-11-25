-- 20270131000020_class_requests_v2.sql
BEGIN;

ALTER TABLE public.class_requests
  ADD COLUMN IF NOT EXISTS request_type text DEFAULT 'exemption',
  ADD COLUMN IF NOT EXISTS posted_by_role text,
  ADD COLUMN IF NOT EXISTS interest_window_start timestamptz,
  ADD COLUMN IF NOT EXISTS interest_window_end timestamptz,
  ADD COLUMN IF NOT EXISTS min_interest_pct numeric DEFAULT 0.50,
  ADD COLUMN IF NOT EXISTS linked_timetable_slot_id uuid,
  ADD COLUMN IF NOT EXISTS status_v2 text DEFAULT 'open';

CREATE TABLE IF NOT EXISTS public.class_request_interest (
  request_id uuid NOT NULL REFERENCES public.class_requests(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  vote       text NOT NULL CHECK (vote IN ('yes', 'maybe', 'no')),
  voted_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, student_id)
);

COMMIT;
