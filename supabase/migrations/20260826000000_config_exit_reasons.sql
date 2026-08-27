-- Create config_exit_reasons table
CREATE TABLE IF NOT EXISTS public.config_exit_reasons (
    code text PRIMARY KEY,
    name text NOT NULL,
    description text,
    applicable_to text[] NOT NULL,
    requires_approval boolean DEFAULT false,
    approval_by text DEFAULT 'none',
    parent_notification text DEFAULT 'silent',
    max_duration_hours integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Seed defaults for config_exit_reasons
INSERT INTO public.config_exit_reasons (code, name, description, applicable_to, requires_approval, approval_by, parent_notification, max_duration_hours) VALUES
('Regular', 'Regular', 'Regular exit/entry', ARRAY['HM', 'HF', 'DM', 'DF'], false, 'none', 'silent', NULL),
('Home Out', 'Home Out', 'Going home for overnight/weekend', ARRAY['HM', 'HF'], true, 'warden', 'sms', 48),
('Day Out', 'Day Out', 'Full day out', ARRAY['HM', 'HF'], true, 'warden', 'push', 12),
('Leave', 'Leave', 'Sick leave or other special leave', ARRAY['HM', 'HF', 'DM', 'DF'], true, 'admin', 'push', NULL)
ON CONFLICT (code) DO NOTHING;

-- Create config_student_rules table
CREATE TABLE IF NOT EXISTS public.config_student_rules (
    student_type text PRIMARY KEY,
    curfew text,
    short_outing_max integer DEFAULT 0,
    short_outing_duration integer DEFAULT 0,
    long_outing_max integer DEFAULT 0,
    allowed_exit_codes text[] DEFAULT ARRAY['Regular'],
    exit_deadline text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Seed defaults for config_student_rules
INSERT INTO public.config_student_rules (student_type, curfew, short_outing_max, short_outing_duration, long_outing_max, allowed_exit_codes, exit_deadline) VALUES
('HM', '19:30', 2, 6, 48, ARRAY['Regular', 'Home Out', 'Day Out', 'Leave'], NULL),
('HF', '18:30', 2, 6, 48, ARRAY['Regular', 'Home Out', 'Day Out', 'Leave'], NULL),
('DM', NULL, 0, 0, 0, ARRAY['Regular', 'Leave'], '17:30'),
('DF', NULL, 0, 0, 0, ARRAY['Regular', 'Leave'], '17:30')
ON CONFLICT (student_type) DO NOTHING;

-- RLS policies
ALTER TABLE public.config_exit_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_student_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users"
ON public.config_exit_reasons FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read access to authenticated users"
ON public.config_student_rules FOR SELECT
TO authenticated
USING (true);

-- Allow anon as well
CREATE POLICY "Allow read access to anon users"
ON public.config_exit_reasons FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow read access to anon users"
ON public.config_student_rules FOR SELECT
TO anon
USING (true);
