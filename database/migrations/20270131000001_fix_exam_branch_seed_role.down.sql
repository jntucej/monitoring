-- Down for 20270131000001_fix_exam_branch_seed_role.sql
-- Reverts the EXAM_BRANCH demo account to its original seeded role.

BEGIN;

UPDATE users
SET role = 'staff'
WHERE unique_id = 'EXAM_BRANCH';

COMMIT;
