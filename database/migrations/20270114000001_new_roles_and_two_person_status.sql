-- 20270114000001_new_roles_and_two_person_status.sql
-- Entity-aligned role expansion + two-person academic-status enforcement.
-- Idempotent: every statement is guarded or uses IF NOT EXISTS.

BEGIN;

-- 1. Extend users.role CHECK constraint with the new entity roles.
--    New roles: dean, chief_warden,
--    controller_examinations, addl_controller_academic,
--    addl_controller_results, addl_controller_automation.
--    (deputy_warden / hostel_manager / oie / exam_superintendent /
--     exam_branch already exist.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = 'public.users'::regclass
      AND c.conname = 'users_role_check'
  ) THEN
    RAISE NOTICE 'users_role_check constraint not found; skipping';
  ELSE
    ALTER TABLE public.users DROP CONSTRAINT users_role_check;
    ALTER TABLE public.users ADD CONSTRAINT users_role_check
      CHECK (role = ANY (ARRAY[
        'operator','admin','sysadmin','supervisor','guardian','parent',
        'hod','student','faculty','staff','worker','visitor','caretaker',
        'deputy_warden','hostel_manager','principal','vice_principal','oie',
        'exam_branch','exam_superintendent','mess_incharge','emo',
        -- new entity roles
        'dean','chief_warden',
        'controller_examinations','addl_controller_academic',
        'addl_controller_results','addl_controller_automation'
      ]));
    RAISE NOTICE 'users_role_check extended with 6 new entity roles';
  END IF;
END;
$$;

-- 2. Register the new roles in config_roles_registry (columns:
--    code, display_name, is_privileged, is_super, is_active, created_at).
INSERT INTO public.config_roles_registry (code, display_name, is_privileged, is_super, is_active)
VALUES
  ('dean', 'Dean (Academics / Student Affairs)', FALSE, FALSE, TRUE),
  ('chief_warden', 'Chief Warden', FALSE, FALSE, TRUE),
  ('controller_examinations', 'Controller of Examinations', TRUE, FALSE, TRUE),
  ('addl_controller_academic', 'Addl. Controller (Academic)', FALSE, FALSE, TRUE),
  ('addl_controller_results', 'Addl. Controller (Results)', FALSE, FALSE, TRUE),
  ('addl_controller_automation', 'Addl. Controller (Automation)', FALSE, FALSE, TRUE)
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- 3. Two-person rule for DEBARRED / SUSPENDED:
--    Add pending/approval state to student_details. A HOD sets the status
--    to PENDING; a dean / principal / admin / sysadmin approves (or
--    rejects) it. Only then does the effective status take effect and
--    users.flag_status is synced.
ALTER TABLE public.student_details
  ADD COLUMN IF NOT EXISTS status_pending_approver  TEXT,
  ADD COLUMN IF NOT EXISTS status_approved_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_approved_by       TEXT,
  ADD COLUMN IF NOT EXISTS status_rejected_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_rejected_by       TEXT,
  ADD COLUMN IF NOT EXISTS status_reject_reason     TEXT;

COMMENT ON COLUMN public.student_details.status_pending_approver
  IS 'HOD-set status awaiting two-person approval: NULL = not pending; value matches academic_status';

-- Trigger: when academic_status is set to DEBARRED/SUSPENDED by a role
-- that is NOT in the approver set, mark it pending instead of applying.
-- The approver set is enforced in the API layer (requiredRole), so the
-- DB trigger is a defense-in-depth backstop: any direct SQL write that
-- bypasses the API still lands in pending state.
DROP TRIGGER IF EXISTS td_student_academic_status_two_person ON public.student_details;
CREATE OR REPLACE FUNCTION public.student_academic_status_two_person()
RETURNS TRIGGER AS $$
DECLARE
  approver_roles TEXT[] := ARRAY['dean','principal','admin','sysadmin','vice_principal','chief_warden'];
  v_role TEXT;
BEGIN
  -- Resolve the acting role. API writes carry it in the session's
  -- role (pg_user). Direct SQL without a role defaults to 'gate_app'.
  SELECT current_user INTO v_role;
  -- If the acting user is in the approver set, allow the write through
  -- and clear pending markers.
  IF v_role = ANY (approver_roles) THEN
    NEW.status_pending_approver := NULL;
    NEW.status_approved_at := now();
    NEW.status_approved_by := v_role;
    NEW.status_rejected_at := NULL;
    NEW.status_rejected_by := NULL;
    NEW.status_reject_reason := NULL;
    RETURN NEW;
  END IF;
  -- Otherwise: if the status is DEBARRED or SUSPENDED, park it in
  -- pending state. The actual academic_status column is set but
  -- gate/RLS consumers should treat PENDING as not-yet-effective.
  IF NEW.academic_status IN ('DEBARRED','SUSPENDED') THEN
    NEW.status_pending_approver := NEW.academic_status;
    NEW.status_approved_at := NULL;
    NEW.status_approved_by := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER td_student_academic_status_two_person
  BEFORE UPDATE OF academic_status ON public.student_details
  FOR EACH ROW EXECUTE FUNCTION public.student_academic_status_two_person();

-- View: effective status = academic_status only when approved or pending
-- is NULL and the write came from an approver. For gate consumers:
-- treat PENDING as not-yet-effective (student retains access until
-- approval lands).
CREATE OR REPLACE VIEW public.student_effective_academic_status AS
SELECT
  sd.user_id,
  sd.academic_status,
  sd.status_pending_approver,
  sd.status_approved_at,
  -- Effective status: the flag is active only when it is NOT in pending
  -- state. Pending DEBARRED does not block gate access yet.
  CASE
    WHEN sd.status_pending_approver IS NOT NULL THEN NULL
    ELSE sd.academic_status
  END AS effective_status
FROM public.student_details sd;

GRANT SELECT ON public.student_effective_academic_status TO gate_app, admin, authenticated;

COMMIT;
