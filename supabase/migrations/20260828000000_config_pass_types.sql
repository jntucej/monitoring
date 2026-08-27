CREATE TABLE IF NOT EXISTS public.config_pass_types (
    code text PRIMARY KEY,
    name text NOT NULL,
    description text,
    default_duration_hours integer,
    requires_approval boolean DEFAULT true,
    approval_flow text DEFAULT 'warden',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Seed default types
INSERT INTO public.config_pass_types (code, name, description, default_duration_hours, requires_approval, approval_flow)
VALUES
    ('outing', 'Outing', 'Short local outing', 4, TRUE, 'warden'),
    ('home_leave', 'Home Leave', 'Weekend or long leave', 48, TRUE, 'warden'),
    ('emergency', 'Emergency Leave', 'Emergency exit without prior approval', 2, FALSE, 'none')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    default_duration_hours = EXCLUDED.default_duration_hours,
    requires_approval = EXCLUDED.requires_approval,
    approval_flow = EXCLUDED.approval_flow,
    updated_at = NOW();

ALTER TABLE public.config_pass_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users" 
ON public.config_pass_types FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow read access to anon users" 
ON public.config_pass_types FOR SELECT 
TO anon 
USING (true);