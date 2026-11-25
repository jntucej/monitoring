-- 20270131000014_security_posts.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.security_posts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text UNIQUE NOT NULL,
  name         text NOT NULL,
  kind         text NOT NULL CHECK (kind IN (
    'gate', 'patrol', 'visitor_desk', 'sos_only', 'control_room'
  )),
  location_id  uuid NOT NULL REFERENCES public.campus_locations(id),
  capabilities text[] NOT NULL DEFAULT '{}',
  min_guards   int NOT NULL DEFAULT 1,
  max_guards   int NOT NULL DEFAULT 1,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMIT;
