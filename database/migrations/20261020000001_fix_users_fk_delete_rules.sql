-- database/migrations/20261020000000_fix_users_fk_delete_rules.sql
-- Fix foreign key constraints referencing users(id) to SET NULL on delete,
-- avoiding constraint violations when deleting or deprovisioning users with history.

BEGIN;

-- gate_passes: historical references should survive user deletion by setting NULL
ALTER TABLE public.gate_passes
  DROP CONSTRAINT IF EXISTS gate_passes_requested_by_id_fkey,
  DROP CONSTRAINT IF EXISTS gate_passes_guardian_approver_id_fkey,
  DROP CONSTRAINT IF EXISTS gate_passes_admin_approver_id_fkey;

ALTER TABLE public.gate_passes
  ADD CONSTRAINT gate_passes_requested_by_id_fkey
    FOREIGN KEY (requested_by_id) REFERENCES public.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT gate_passes_guardian_approver_id_fkey
    FOREIGN KEY (guardian_approver_id) REFERENCES public.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT gate_passes_admin_approver_id_fkey
    FOREIGN KEY (admin_approver_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- alerts: resolved_by → NULL when resolver is deleted
ALTER TABLE public.alerts
  DROP CONSTRAINT IF EXISTS alerts_resolved_by_fkey;

ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_resolved_by_fkey
    FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- users.pin_set_by: self-reference → NULL when setter is deleted
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_pin_set_by_fkey;

ALTER TABLE public.users
  ADD CONSTRAINT users_pin_set_by_fkey
    FOREIGN KEY (pin_set_by) REFERENCES public.users(id) ON DELETE SET NULL;

COMMIT;
