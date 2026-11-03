-- Batch I5: wire the LLM / SMS / email / audit-rotation / backup
-- automation kill switches into the automation_controls table.
--
-- The DR migration (20270105000004) created 5 rows for the auto-heal /
-- scale / response / backup-verify / drill switches. This migration adds
-- the 5 application-layer switches so that setting enabled=FALSE on a row
-- actually stops the corresponding subsystem:
--
--   auto_llm_enabled            — bot chat RAG + LLM completion
--   auto_sms_enabled            — SMS dispatch (MSG91 provider call)
--   auto_email_enabled          — email dispatch (Brevo provider call)
--   auto_audit_rotation_enabled — audit_logs 90-day rotation job
--   auto_backup_enabled         — master-backup.sh cron
--
-- All 5 default to TRUE so an upgrade is a no-op until someone
-- explicitly turns one off. The kill-switch reader (src/lib/kill-switch.ts)
-- fails OPEN on DB errors (a locked DB must not take down the app).

BEGIN;

INSERT INTO public.automation_controls (name, enabled) VALUES
  ('auto_llm_enabled',            TRUE),
  ('auto_sms_enabled',            TRUE),
  ('auto_email_enabled',          TRUE),
  ('auto_audit_rotation_enabled', TRUE),
  ('auto_backup_enabled',         TRUE)
ON CONFLICT (name) DO NOTHING;

COMMIT;
