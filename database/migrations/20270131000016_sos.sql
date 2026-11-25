-- 20270131000016_sos.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.sos_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     uuid NOT NULL,
  category       text NOT NULL,
  priority       text NOT NULL DEFAULT 'normal'
                   CHECK (priority IN ('normal', 'urgent', 'critical')),
  status         text NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'dispatched', 'en_route', 'on_scene', 'resolved', 'cancelled', 'escalated')),
  student_lat    numeric(9,6),
  student_lng    numeric(9,6),
  nearest_loc_id uuid REFERENCES public.campus_locations(id),
  chosen_loc_id  uuid REFERENCES public.campus_locations(id),
  description    text,
  photo_url      text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  resolved_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sos_open
  ON public.sos_requests (status, created_at DESC)
  WHERE status IN ('open', 'dispatched', 'en_route', 'on_scene');

CREATE TABLE IF NOT EXISTS public.sos_dispatch (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sos_id         uuid NOT NULL REFERENCES public.sos_requests(id) ON DELETE CASCADE,
  operator_id    uuid NOT NULL,
  post_id        uuid REFERENCES public.security_posts(id),
  assigned_at    timestamptz NOT NULL DEFAULT now(),
  ack_at         timestamptz,
  en_route_at    timestamptz,
  on_scene_at    timestamptz,
  cleared_at     timestamptz,
  decline_reason text,
  distance_m     int,
  status         text NOT NULL DEFAULT 'offered'
                   CHECK (status IN ('offered', 'accepted', 'declined', 'expired', 'en_route', 'on_scene', 'cleared', 'escalated'))
);

CREATE INDEX IF NOT EXISTS idx_sos_dispatch_operator ON public.sos_dispatch (operator_id, status);
CREATE INDEX IF NOT EXISTS idx_sos_dispatch_sos ON public.sos_dispatch (sos_id, status);

CREATE TABLE IF NOT EXISTS public.sos_events (
  id          bigserial PRIMARY KEY,
  sos_id      uuid NOT NULL,
  actor_id    uuid,
  actor_role  text,
  kind        text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sos_events_sos ON public.sos_events (sos_id, occurred_at);

COMMIT;
