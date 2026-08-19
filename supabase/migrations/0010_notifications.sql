-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('person', 'role', 'department', 'all')),
  channels TEXT[] NOT NULL DEFAULT ARRAY['in_app'],
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id TEXT PRIMARY KEY,
  channels JSONB NOT NULL DEFAULT '{"push": true, "sms": true, "email": true, "in_app": true}',
  types JSONB NOT NULL DEFAULT '{}',
  quiet_hours JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Push Notification Queue
CREATE TABLE IF NOT EXISTS notification_push_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id TEXT REFERENCES notifications(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SMS Queue
CREATE TABLE IF NOT EXISTS notification_sms_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id TEXT REFERENCES notifications(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email Queue
CREATE TABLE IF NOT EXISTS notification_email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id TEXT REFERENCES notifications(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_queue_status ON notification_push_queue(status);
CREATE INDEX IF NOT EXISTS idx_sms_queue_status ON notification_sms_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON notification_email_queue(status);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_push_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_sms_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_email_queue ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (recipient_id = auth.uid()::TEXT OR recipient_id = 'all');

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (recipient_id = auth.uid()::TEXT)
WITH CHECK (recipient_id = auth.uid()::TEXT);

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences"
ON notification_preferences FOR SELECT
USING (user_id = auth.uid()::TEXT);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
ON notification_preferences FOR UPDATE
USING (user_id = auth.uid()::TEXT)
WITH CHECK (user_id = auth.uid()::TEXT);
