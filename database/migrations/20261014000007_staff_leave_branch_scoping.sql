-- Add branch/department scoping to staff_leave approvals:
-- a HOD can only approve leave requests from their own branch.
ALTER TABLE public.permission_requests
  ADD COLUMN IF NOT EXISTS branch TEXT;

COMMENT ON COLUMN public.permission_requests.branch
  IS 'Branch (CSE/IT/ECE/EEE/MECH) that must approve this request; for staff_leave this is the requester''s branch.';
