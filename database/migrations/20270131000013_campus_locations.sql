-- 20270131000013_campus_locations.sql
BEGIN;

CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

CREATE TABLE IF NOT EXISTS public.campus_locations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text UNIQUE NOT NULL,
  name       text NOT NULL,
  kind       text NOT NULL CHECK (kind IN (
    'gate', 'building', 'hostel_block', 'open_area',
    'lab', 'library', 'canteen', 'parking', 'junction', 'sos_point'
  )),
  parent_id  uuid REFERENCES public.campus_locations(id),
  lat        numeric(9,6) NOT NULL,
  lng        numeric(9,6) NOT NULL,
  radius_m   int NOT NULL DEFAULT 30,
  gate_id    uuid,
  geo        earth GENERATED ALWAYS AS (ll_to_earth(lat::float8, lng::float8)) STORED,
  active     boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campus_locations_geo ON public.campus_locations USING gist (geo);
CREATE INDEX IF NOT EXISTS idx_campus_locations_kind ON public.campus_locations (kind, active);

COMMIT;
