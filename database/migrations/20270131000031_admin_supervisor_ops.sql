-- 20270131000031_admin_supervisor_ops.sql
BEGIN;

INSERT INTO public.ref_categories (domain, code, label, description, sort_order, active)
VALUES
  ('visitor_category', 'parent',     'Parent / Guardian', 'Student parent or guardian', 1, true),
  ('visitor_category', 'vendor',     'Vendor / Delivery', 'Campus vendor or delivery',  2, true),
  ('visitor_category', 'official',   'Official / Audit',  'University / AICTE / NBA',   3, true),
  ('visitor_category', 'guest',      'Guest / Speaker',   'Academic guest or speaker',  4, true),
  ('visitor_category', 'contractor', 'Contractor',        'Maintenance contractor',     5, true)
ON CONFLICT (domain, code) DO NOTHING;

ALTER TABLE public.visitor_pre_registrations
  ADD COLUMN IF NOT EXISTS category_code text DEFAULT 'guest',
  ADD COLUMN IF NOT EXISTS host_user_id uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.visitor_watchlist
  ADD COLUMN IF NOT EXISTS photo_url text;

CREATE TABLE IF NOT EXISTS public.access_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  requested_role text NOT NULL,
  resource_scope text,
  reason         text NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_by     uuid,
  decided_at     timestamptz,
  decision_note  text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.emergency_protocols (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  title       text NOT NULL,
  severity    text NOT NULL DEFAULT 'high' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  steps       jsonb NOT NULL DEFAULT '[]'::jsonb,
  owner_role  text NOT NULL DEFAULT 'supervisor',
  active      boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.emergency_protocols (code, title, severity, steps, owner_role)
VALUES
  ('FIRE',     'Fire & Evacuation Protocol', 'critical', '["Trigger campus alarm","Evacuate nearest assembly point","Account for hostel residents","Notify fire services & Principal"]'::jsonb, 'supervisor'),
  ('MEDICAL',  'Medical Emergency Protocol', 'high',     '["Dispatch nearest patrol guard","Call campus medical officer","Clear gate for ambulance","Notify guardian & warden"]'::jsonb, 'supervisor'),
  ('LOCKDOWN', 'Campus Lockdown Protocol',   'critical', '["Lock all main & hostel gates","Broadcast lockdown alert","Verify guard check-ins","Await Principal all-clear"]'::jsonb, 'admin'),
  ('INTRUDER', 'Unauthorized Entry Protocol','high',     '["Flag watchlist/subject at gate","Dispatch patrol to sector","Escalate to supervisor & Principal"]'::jsonb, 'supervisor')
ON CONFLICT (code) DO NOTHING;

COMMIT;
