-- 20270131000026_worker_types_and_logs.sql
BEGIN;

INSERT INTO public.ref_categories (domain, code, label, description, sort_order, active)
VALUES
  ('worker_type', 'kitchen',      'Kitchen & Dining',          'Kitchen prep and dining support', 1, true),
  ('worker_type', 'housekeeping', 'Sanitation & Housekeeping', 'Block and campus housekeeping',   2, true),
  ('worker_type', 'maintenance',  'Facility Maintenance',      'General repairs and upkeep',      3, true),
  ('worker_type', 'electrical',   'Electrical',                'Electrical maintenance',          4, true),
  ('worker_type', 'plumbing',     'Plumbing',                  'Water and plumbing support',      5, true),
  ('worker_type', 'gardening',    'Grounds & Gardening',       'Campus groundskeeping',           6, true),
  ('worker_type', 'laundry',      'Laundry Services',          'Hostel laundry operations',       7, true),
  ('worker_type', 'general',      'Campus Support',            'General campus operations',       8, true)
ON CONFLICT (domain, code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.worker_assignments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  worker_type_code text NOT NULL,
  block_id         text,
  shift_name       text NOT NULL DEFAULT 'Morning',
  starts_at        time NOT NULL DEFAULT '06:00:00',
  ends_at          time NOT NULL DEFAULT '14:00:00',
  assigned_by      uuid NOT NULL,
  active           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worker_assignments_worker
  ON public.worker_assignments (worker_id, active);

CREATE TABLE IF NOT EXISTS public.worker_attendance_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.worker_assignments(id),
  block_id      text,
  direction     text NOT NULL CHECK (direction IN ('IN', 'OUT')),
  logged_at     timestamptz NOT NULL DEFAULT now(),
  logged_by     uuid,
  lat           numeric(9,6),
  lng           numeric(9,6),
  notes         text
);

CREATE INDEX IF NOT EXISTS idx_worker_att_worker
  ON public.worker_attendance_logs (worker_id, logged_at DESC);

COMMIT;
