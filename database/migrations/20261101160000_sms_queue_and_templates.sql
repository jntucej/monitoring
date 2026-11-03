BEGIN;

-- 1. Loosen notification_id (compose may not attach to a notification row)
ALTER TABLE public.notification_sms_queue
  ALTER COLUMN notification_id DROP NOT NULL;

-- 1b. The gate schema.sql ships notification_sms_queue WITHOUT
--     provider_message_id (used by the MSG91 webhook for delivery receipts).
--     Add it idempotently so the partial index below can be created.
ALTER TABLE public.notification_sms_queue
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT;

-- 2. Add the fields the UI + worker + MSG91 webhook need
ALTER TABLE public.notification_sms_queue
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal','urgent','otp')),
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracking_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS sender_id VARCHAR(6),
  ADD COLUMN IF NOT EXISTS dlt_template_id TEXT,
  ADD COLUMN IF NOT EXISTS template_code TEXT,
  ADD COLUMN IF NOT EXISTS template_vars JSONB,
  ADD COLUMN IF NOT EXISTS cost_inr NUMERIC(8,4);

-- 3. Rebuild status CHECK to include delivered + dead_letter + expired
ALTER TABLE public.notification_sms_queue
  DROP CONSTRAINT IF EXISTS notification_sms_queue_status_check;
ALTER TABLE public.notification_sms_queue
  ADD CONSTRAINT notification_sms_queue_status_check
  CHECK (status IN ('pending','processing','sent','delivered','failed','dead_letter','expired'));

-- 4. Indexes for the worker claim + admin list + webhook lookups
CREATE INDEX IF NOT EXISTS idx_sms_queue_claimable
  ON public.notification_sms_queue (priority DESC, next_attempt_at, created_at)
  WHERE status IN ('pending','failed');
CREATE INDEX IF NOT EXISTS idx_sms_queue_admin_list
  ON public.notification_sms_queue (created_at DESC, status);
CREATE INDEX IF NOT EXISTS idx_sms_queue_tracking
  ON public.notification_sms_queue (tracking_id)
  WHERE tracking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sms_queue_provider_msg
  ON public.notification_sms_queue (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

-- 5. SMS templates table (DLT-compliant bodies use {#var#} syntax)
CREATE TABLE IF NOT EXISTS public.sms_templates (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  body TEXT NOT NULL,
  variables TEXT[] NOT NULL DEFAULT '{}',
  sender_id VARCHAR(6) NOT NULL DEFAULT 'JNTUCE',
  dlt_template_id TEXT,
  category TEXT NOT NULL DEFAULT 'transactional'
    CHECK (category IN ('transactional','service','promotional')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.sms_template_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  version INTEGER NOT NULL,
  body TEXT NOT NULL,
  dlt_template_id TEXT,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sms_template_history_code
  ON public.sms_template_history (code, created_at DESC);

-- 6. Seed templates (DLT IDs left NULL — fill in after registration)
INSERT INTO public.sms_templates (code, label, body, variables, sender_id, category) VALUES
  ('pass_approved',
   'Pass approved',
   'Dear Parent, {#name#}''s {#reason#} pass for {#date#} has been APPROVED. Ticket {#ticket#}. - JNTUCEJ',
   ARRAY['name','reason','date','ticket'], 'JNTUCE', 'transactional'),
  ('pass_rejected',
   'Pass rejected',
   'Dear Parent, {#name#}''s pass request for {#date#} was NOT approved. Contact hostel office. - JNTUCEJ',
   ARRAY['name','date'], 'JNTUCE', 'transactional'),
  ('student_exit_home_out',
   'Student exited (home out)',
   'Dear Parent, {#name#} ({#roll#}) has exited campus for HOME OUT at {#time#}. Return by {#return_by#}. - JNTUCEJ',
   ARRAY['name','roll','time','return_by'], 'JNTUCE', 'transactional'),
  ('student_return',
   'Student returned',
   'Dear Parent, {#name#} ({#roll#}) has returned to campus at {#time#}. - JNTUCEJ',
   ARRAY['name','roll','time'], 'JNTUCE', 'transactional'),
  ('emergency_sos',
   'SOS alert',
   'URGENT: {#name#} ({#roll#}) raised SOS at {#time#}. Location: {#location#}. Contact campus security: {#phone#}. - JNTUCEJ',
   ARRAY['name','roll','time','location','phone'], 'JNTUCE', 'transactional'),
  ('password_reset_otp',
   'Password reset OTP',
   '{#otp#} is your Gate Monitor password reset code. Valid 10 min. Do not share. - JNTUCEJ',
   ARRAY['otp'], 'JNTUCE', 'transactional'),
  ('enrollment_code',
   'Enrollment code',
   '{#code#} is your Gate Monitor enrollment code. Valid 7 days. - JNTUCEJ',
   ARRAY['code'], 'JNTUCE', 'transactional'),
  ('mess_token',
   'Mess token',
   'Your mess token code is {#code#}. Show at counter. Expires {#expires#}. - JNTUCEJ',
   ARRAY['code','expires'], 'JNTUCE', 'transactional'),
  ('mess_no_show',
   'Mess no-show warning',
   'Dear {#name#}, you have missed {#count#} meals this week. Please confirm preferences. - JNTUCEJ',
   ARRAY['name','count'], 'JNTUCE', 'service')
ON CONFLICT (code) DO NOTHING;

-- 7. Retention policies — seed sensible defaults for the retention cron
INSERT INTO public.retention_policies (id, data_category, retention_days, auto_delete) VALUES
  ('scan_logs',      'movement_logs',              365, TRUE),
  ('api_telemetry',  'api_metrics',                  30, TRUE),
  ('audit_trail',    'audit_logs',                 1825, FALSE),
  ('sessions',       'sessions',                    30, TRUE),
  ('notifications',  'notifications',                90, TRUE),
  ('mess_reviews',   'mess_meal_reviews',              7, TRUE),
  ('email_queue',    'notification_email_queue',      30, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 8. Self-record
INSERT INTO schema_migrations (version, filename, checksum)
VALUES ('20261101160000', '20261101160000_sms_queue_and_templates.sql', md5('20261101160000_sms_queue_and_templates'))
ON CONFLICT (version) DO NOTHING;

COMMIT;
