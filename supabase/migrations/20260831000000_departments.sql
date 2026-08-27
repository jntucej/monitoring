-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
    code text PRIMARY KEY,
    name text NOT NULL,
    short_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Seed default departments
INSERT INTO public.departments (code, name, short_name) VALUES
('CSE', 'Computer Science & Engineering', 'CSE'),
('IT', 'Information Technology', 'IT'),
('ECE', 'Electronics & Communication Engineering', 'ECE'),
('EEE', 'Electrical & Electronics Engineering', 'EEE'),
('ME', 'Mechanical Engineering', 'ME'),
('CIVIL', 'Civil Engineering', 'CIVIL')
ON CONFLICT (code) DO NOTHING;

-- RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all users"
ON public.departments FOR SELECT
USING (true);
