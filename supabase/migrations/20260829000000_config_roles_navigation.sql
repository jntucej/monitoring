-- Roles table
CREATE TABLE IF NOT EXISTS public.config_roles (
    code TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    icon_name TEXT,
    default_redirect TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Navigation items table
CREATE TABLE IF NOT EXISTS public.config_navigation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_code TEXT NOT NULL REFERENCES public.config_roles(code) ON DELETE CASCADE,
    group_label TEXT NOT NULL,
    href TEXT NOT NULL,
    label TEXT NOT NULL,
    icon_name TEXT,
    badge TEXT,
    "order" INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default roles
INSERT INTO public.config_roles (code, display_name, description, icon_name, default_redirect)
VALUES
    ('operator', 'Gate Operator', 'Security Gate Officers', 'ScanLine', '/gate/1'),
    ('admin', 'Administrator', 'College Administration', 'LayoutDashboard', '/admin'),
    ('sysadmin', 'System Admin', 'IT Infrastructure & Security', 'Settings', '/sysadmin'),
    ('student', 'Student', 'Campus Members', 'GraduationCap', '/student'),
    ('guardian', 'Guardian', 'Guardians & Wards', 'Users', '/parent'),
    ('supervisor', 'Supervisor', 'System Supervising', 'RadioTower', '/supervisor'),
    ('faculty', 'Faculty', 'Department Faculty', 'BookOpen', '/faculty')
ON CONFLICT (code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    icon_name = EXCLUDED.icon_name,
    default_redirect = EXCLUDED.default_redirect,
    updated_at = NOW();

-- Seed default navigation items
INSERT INTO public.config_navigation (role_code, group_label, href, label, icon_name, badge, "order")
VALUES
    -- Operator
    ('operator', 'Gate Terminal', '/gate/active', 'Gate Scanner', 'ScanLine', 'LIVE', 1),
    ('operator', 'Operations', '/gate/history', 'Scan Log History', 'History', NULL, 2),
    ('operator', 'Operations', '/gate/manual', 'Manual Entry Desk', 'UserCheck', NULL, 3),

    -- Admin
    ('admin', 'Analytics & Oversight', '/admin', 'Dashboard Overview', 'LayoutDashboard', NULL, 1),
    ('admin', 'Analytics & Oversight', '/admin/analytics', 'Campus Analytics', 'FileSpreadsheet', 'NEW', 2),
    ('admin', 'Analytics & Oversight', '/admin/students', 'Person Roster', 'GraduationCap', NULL, 3),
    ('admin', 'Analytics & Oversight', '/admin/alerts', 'Security Alerts', 'AlertTriangle', 'SECURE', 4),
    ('admin', 'Analytics & Oversight', '/admin/reports', 'Gate Reports', 'FileSpreadsheet', NULL, 5),
    ('admin', 'Access Control & Roster', '/admin/users', 'User Access Roles', 'Users', NULL, 6),
    ('admin', 'Access Control & Roster', '/admin/workers', 'Worker Management', 'HardHat', 'RESTRICT', 7),

    -- Sysadmin
    ('sysadmin', 'System Management', '/sysadmin', 'System Console', 'Settings', NULL, 1),
    ('sysadmin', 'System Management', '/sysadmin/audit', 'Audit & Security', 'Shield', NULL, 2),

    -- Student
    ('student', 'My Identity', '/student', 'Digital ID Card', 'GraduationCap', NULL, 1),
    ('student', 'My Identity', '/student/passes', 'Gate Passes', 'QrCode', 'QR', 2),
    ('student', 'My Identity', '/student/profile', 'My Profile', 'User', NULL, 3),

    -- Guardian
    ('guardian', 'Ward Portal', '/parent', 'Ward Overview', 'Users', NULL, 1),
    ('guardian', 'Ward Portal', '/parent/request', 'Request Pass', 'QrCode', NULL, 2),
    
    -- Faculty
    ('faculty', 'Department Console', '/faculty', 'Department Dashboard', 'Building2', NULL, 1),
    ('faculty', 'Department Console', '/hod', 'HOD Department Console', 'ShieldCheck', NULL, 2),
    ('faculty', 'Department Console', '/visitor', 'Visitor Management', 'Users', NULL, 3)

ON CONFLICT (id) DO UPDATE SET
    group_label = EXCLUDED.group_label,
    href = EXCLUDED.href,
    label = EXCLUDED.label,
    icon_name = EXCLUDED.icon_name,
    badge = EXCLUDED.badge,
    "order" = EXCLUDED."order",
    updated_at = NOW();

-- RLS
ALTER TABLE public.config_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_navigation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to anon on config_roles" 
ON public.config_roles FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read access to auth on config_roles" 
ON public.config_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to anon on config_navigation" 
ON public.config_navigation FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read access to auth on config_navigation" 
ON public.config_navigation FOR SELECT TO authenticated USING (true);