-- database/migrations/20261011214459_add_exam_superintendent_role.sql
-- Purpose: Add exam_superintendent role to permission workflow

-- 1. Expand users.role CHECK constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (
    role IN (
        'operator','admin','sysadmin','supervisor','guardian','parent','hod','student',
        'warden','faculty','staff','worker','visitor',
        'caretaker','deputy_warden','hostel_manager','principal','vice_principal','oie','exam_branch',
        'exam_superintendent'
    )
);

-- 2. Add hostel_scope users (if not exists)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS hostel_scope TEXT CHECK (hostel_scope IN ('boys','girls','both'));

-- 3. Insert into config_roles_registry (idempotent)
INSERT INTO public.config_roles_registry (code, display_name)
VALUES ('exam_superintendent', 'Exam Superintendent')
ON CONFLICT (code) DO NOTHING;

COMMENT ON COLUMN public.users.hostel_scope IS 'Hostel scope for hostel-scoped roles: boys, girls, both';
