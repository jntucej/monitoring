-- Add 'warden' back to the users.role CHECK constraint.
--
-- The 20261125000001 warden→principal consolidation migration tightened the
-- CHECK constraint to exclude 'warden'. The campus still operates a
-- hostel-warden workflow and requires a live warden login account, so we
-- re-add the role. The config_roles_registry row was already reactivated
-- by this deployment (see 20261225000001_reactivate_warden_role.sql).

BEGIN;

ALTER TABLE public.users
  DROP CONSTRAINT users_role_check,
  ADD CONSTRAINT users_role_check CHECK (role = ANY (
    ARRAY[
      'operator','admin','sysadmin','supervisor','guardian','parent',
      'hod','student','faculty','staff','worker','visitor','caretaker',
      'deputy_warden','hostel_manager','principal','vice_principal',
      'oie','exam_branch','exam_superintendent','mess_incharge','warden'
    ]::text[]
  ));

COMMIT;
