-- ============================================================================
-- Hard-delete ALL student-role users, cascading their child rows in FK-safe
-- order. Run AFTER verifying the backup. Irreversible.
--
--   Backup verify:  zcat /root/monitoring/backups/students-backup-raw.sql.gz | head
--   Before:         \dt  -- note student count
--
-- Usage:
--   psql -U postgres -d gate_monitor -f scripts/hard-delete-all-students.sql
-- ============================================================================

BEGIN;

-- 1. Student-specific detail tables (CASCADE would also handle these but be
--    explicit + in-order so a partial failure is obvious).
DELETE FROM student_details
 WHERE user_id IN (SELECT id FROM users WHERE role='student');

-- 2. gate_passes rows referencing students (requester or approver).
DELETE FROM gate_passes
 WHERE requested_by_id     IN (SELECT id FROM users WHERE role='student')
    OR guardian_approver_id IN (SELECT id FROM users WHERE role='student')
    OR admin_approver_id    IN (SELECT id FROM users WHERE role='student');

-- 3. movement_logs where the actor was a student.
DELETE FROM movement_logs
 WHERE user_id     IN (SELECT id FROM users WHERE role='student')
    OR operator_id IN (SELECT id FROM users WHERE role='student');

-- 4. sessions / user_roles referencing these students.
--    (audit_logs is intentionally immutable — leave its 6 historical rows;
--    they record *who did what*, not live data, and deleting them would be
--    a security regression. The FK is NO ACTION but audit rows keep their
--    user_id so the history stays queryable even after the student is gone.)
DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE role='student');
DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE role='student');

-- 5. The students themselves.
DELETE FROM users WHERE role='student';

COMMIT;

-- Verify
SELECT 'students_remaining' AS check, count(*) FROM users WHERE role='student';
SELECT 'total_users'        AS check, count(*) FROM users;
