-- 20270108000001_m2_privileged_login_template.sql
-- M2: privileged login alert SMS template. Inserted with ON CONFLICT DO
-- NOTHING so re-running on a live database is a no-op.
BEGIN;

INSERT INTO public.sms_templates (code, label, body, variables, sender_id, category)
VALUES (
  'privileged_login_alert',
  'Privileged login alert',
  'Gate Monitor: new login to your {#role#} account at {#time#} from IP {#ip#}. If this was not you, lock your account now from your email.',
  ARRAY['name','time','ip'],
  'JNTUCE',
  'transactional'
)
ON CONFLICT (code) DO NOTHING;

COMMIT;
