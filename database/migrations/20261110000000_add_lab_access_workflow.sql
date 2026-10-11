============================================================================
Migration: 20261110000000_add_lab_access_workflow
Purpose: Add Lab Access workflow with LAB ticket prefix, chain-driven approval
============================================================================

-- 1. Expand users.role CHECK constraint to include exam_superintendent (already in roles.ts)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (
  role IN (
    'operator','admin','sysadmin','supervisor','guardian','parent','hod','student',
    'warden','faculty','staff','worker','visitor',
    'caretaker','deputy_warden','hostel_manager','principal','vice_principal','oie','exam_branch',
    'exam_superintendent'
  )
);

-- 2. Add lab_access to permission_requests workflow_type CHECK constraint
ALTER TABLE public.permission_rALTER TABLE public.permission_rALTER TABLE public.permission_rALTER TABLE public.permission_rALTER TABLE public.permission_rAIALTER TABLE public.permission_rALTER TABLE public.permission_rALTER TABLE pteALTER TABLE public.permission_rALTER TABss')
);

------------------------------------------------------------------------------li---------------------------------------------------------------------------ss ------------------------------------------------------------------------------li------------RC--------------------------------------------------------------cademic-----------------------------------------------------------sertat---------- '------------------------------------------------------------------------------liLAB_------------------------------------------------s')------------------------------------------------------------------------------li-----------------AT-------------------TS idx_permissi---------------------------------------------------------------------number)
  WHERE workflow_type = 'lab_access';
