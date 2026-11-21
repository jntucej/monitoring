-- 20270126000001_grant_audit_delete.sql
-- Grant DELETE on audit_logs to gate_app so /api/cron/audit-rotate can purge old rows.
GRANT DELETE ON public.audit_logs TO gate_app;
