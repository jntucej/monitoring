-- 20270131000027_campus_locations_occupant_type.sql
BEGIN;

ALTER TABLE public.campus_locations
  ADD COLUMN IF NOT EXISTS occupant_type text NOT NULL DEFAULT 'mixed'
    CHECK (occupant_type IN ('students', 'faculty', 'staff', 'mixed'));

COMMIT;
