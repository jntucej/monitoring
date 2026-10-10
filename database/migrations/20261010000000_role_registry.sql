-- ============================================================================
-- Migration: 20261010000000_role_registry
-- Purpose: Introduce Roles Registry, centralized privilege helpers, and trigger validation.
-- ============================================================================

-- 1. Helper functions for role privileges
CREATE OR REPLACE FUNCTION public.is_super_admin(p_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_uid AND role = 'sysadmin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(p_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_uid AND role IN ('admin', 'sysadmin')
  );
$$;

-- 2. Define Registry Table
CREATE TABLE IF NOT EXISTS public.config_roles_registry (
  code         TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  is_privileged BOOLEAN NOT NULL DEFAULT false,
  is_super      BOOLEAN NOT NULL DEFAULT false,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.config_roles_registry (code, display_name, is_privileged, is_super) VALUES
  ('sysadmin', 'System Administrator', true,  true),
  ('admin',    'Administrator',        true,  false),
  ('warden',   'Warden',               false, false),
  ('operator', 'Gate Operator',        false, false),
  ('student',  'Student',              false, false),
  ('faculty',  'Faculty',              false, false),
  ('staff',    'Staff',                false, false),
  ('worker',   'Worker',               false, false),
  ('guardian', 'Guardian',             false, false),
  ('parent',   'Parent',               false, false),
  ('hod',      'HOD',                  false, false),
  ('visitor',  'Visitor',              false, false),
  ('supervisor', 'Supervisor',         false, false),
  ('caretaker', 'Caretaker',           false, false),
  ('deputy_warden', 'Deputy Warden',   false, false),
  ('hostel_manager', 'Hostel Manager', false, false),
  ('principal', 'Principal',           false, false),
  ('vice_principal', 'Vice Principal', false, false),
  ('oie',      'OIE',                  false, false),
  ('exam_branch', 'Exam Branch',       false, false)
ON CONFLICT (code) DO NOTHING;

-- 3. Validation Trigger replacing static CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_user_role()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.config_roles_registry WHERE code = NEW.role AND is_active) THEN
    RAISE EXCEPTION 'Invalid or inactive role: %', NEW.role;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_user_role ON public.users;
CREATE TRIGGER trg_validate_user_role
  BEFORE INSERT OR UPDATE OF role ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_role();
