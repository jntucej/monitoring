-- 20270131000032_faculty_and_hostel_ops.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.study_materials (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  class_id     text NOT NULL,
  subject_code text NOT NULL,
  title        text NOT NULL,
  file_url     text NOT NULL,
  description  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hostel_room_allotments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  block_id    text NOT NULL,
  room_number text NOT NULL,
  status      text NOT NULL DEFAULT 'allotted' CHECK (status IN ('pending', 'allotted', 'vacated')),
  allotted_by uuid NOT NULL,
  allotted_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mess_rule_violations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rule_code   text NOT NULL,
  description text NOT NULL,
  severity    text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  reported_by uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.housekeeping_scores (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id  text NOT NULL,
  score     int NOT NULL CHECK (score BETWEEN 1 AND 10),
  notes     text,
  scored_by uuid NOT NULL,
  scored_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.visitor_logs
  ADD COLUMN IF NOT EXISTS photo_url text;

COMMIT;
