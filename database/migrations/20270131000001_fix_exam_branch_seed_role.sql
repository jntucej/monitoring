-- 20270131000001_fix_exam_branch_seed_role.sql
--
-- The EXAM_BRANCH demo account was seeded with role 'staff'
-- (scripts/generate-seed-roles.mjs) but later drifted in the live DB to
-- 'addl_controller_academic', which has no /exam-branch console route —
-- the login succeeded but the account could not reach its own console.
--
-- Idempotent fix: restore the account's role and clear the forced PIN
-- rotation flag so the standard smoke credential reaches the console
-- directly (no PIN-prompt wall on first login).
--
-- Down: reverts the role to 'staff' (its original seeded value).

BEGIN;

UPDATE users
SET role = 'exam_branch',
    pin_must_change = FALSE
WHERE unique_id = 'EXAM_BRANCH';

COMMIT;
