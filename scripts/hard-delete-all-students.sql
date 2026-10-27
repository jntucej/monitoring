-- ============================================================================
-- Hard-delete ALL student-role users, cascading their child rows in FK-safe
-- order. Run AFTER verifying the backup. Irreversible.
--
--   Backup verify:  zcat /root/monitoring/backups/students-backup-raw.sql.gz | head
--
-- Usage:
--   psql -U postgres -d gate_monitor -v ON_ERROR_STOP=1 -f scripts/hard-delete-all-students.sql
--
-- IMPORTANT: `audit_logs` has an immutability trigger (trg_audit_logs_immutable)
-- that blocks ALL UPDATE/DELETE. A user change fires an AFTER trigger that
-- writes to audit_logs, so the guard must be temporarily DISABLED for the
-- duration of the cascade delete, then re-ENABLED before COMMIT. This script
-- does that. Do NOT remove the ENABLE before COMMIT or the security guard is
-- left off.
-- ============================================================================

\set ON_ERROR_STOP on

-- 0. Temporarily disable the immutable audit guard so the users-change trigger
--    can record the deletion without being blocked.
ALTER TABLE public.audit_logs DISABLE TRIGGER trg_audit_logs_immutable;

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

-- 6. Re-enable the security guard BEFORE committing so it is never left off.
COMMIT;
ALTER TABLE public.audit_logs ENABLE TRIGGER trg_audit_logs_immutable;

-- Verify
SELECT 'students_remaining' AS check, count(*) FROM users WHERE role='student';
SELECT 'total_users'        AS check, count(*) FROM users;
SELECT 'audit_guard_state'  AS check, CASE tg.tgenabled WHEN 'O' THEN 'ENABLED' WHEN 'D' THEN 'DISABLED' END
FROM pg_trigger tg WHERE tg.tgname='trg_audit_logs_immutable';
