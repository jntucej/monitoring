-- Migration: Phase 5 AI Intelligence, Predictive Analytics, Occupancy Zones, LMS & Sustainability
-- Date: 2026-09-09

-- 1. Predictions Table
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- 'traffic', 'attendance', 'pass_volume'
  target VARCHAR(100) NOT NULL, -- e.g., 'main_gate', 'cse_department', 'all'
  predicted_value DOUBLE PRECISION NOT NULL,
  confidence_interval_low DOUBLE PRECISION NOT NULL,
  confidence_interval_high DOUBLE PRECISION NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  model_version VARCHAR(20) DEFAULT 'v1.0-arima',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_type_timestamp ON predictions(type, timestamp DESC);

-- 2. Campus Zones Table
CREATE TABLE IF NOT EXISTS zones (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'academic', 'hostel', 'admin', 'sports', 'cafeteria'
  capacity INTEGER NOT NULL DEFAULT 500,
  gate_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial zones if empty
INSERT INTO zones (id, name, type, capacity, gate_ids) VALUES
  ('zone_academic_north', 'Academic Block North (CSE/ECE)', 'academic', 800, ARRAY['gate_main_1', 'gate_north_2']),
  ('zone_academic_south', 'Academic Block South (ME/CE)', 'academic', 600, ARRAY['gate_south_1']),
  ('zone_hostel_boys', 'Boys Hostel Complex', 'hostel', 1000, ARRAY['gate_hostel_b']),
  ('zone_hostel_girls', 'Girls Hostel Complex', 'hostel', 800, ARRAY['gate_hostel_g']),
  ('zone_admin_central', 'Administrative Block & Library', 'admin', 300, ARRAY['gate_admin_1']),
  ('zone_sports_complex', 'Sports & Recreation Hub', 'sports', 400, ARRAY['gate_sports_1'])
ON CONFLICT (id) DO NOTHING;

-- 3. LMS Integration Configuration Table
CREATE TABLE IF NOT EXISTS lms_config (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  platform VARCHAR(50) NOT NULL DEFAULT 'moodle', -- 'moodle', 'canvas', 'blackboard'
  api_url VARCHAR(255) NOT NULL DEFAULT 'https://lms.institution.edu/api',
  api_key_encrypted TEXT,
  sync_schedule VARCHAR(50) DEFAULT 'daily_02:00',
  auto_push_attendance BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'connected',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO lms_config (id, platform, api_url, sync_schedule, auto_push_attendance, status) VALUES
  ('default', 'moodle', 'https://moodle.campus.edu/webservice/rest/server.php', 'daily_02:00', true, 'connected')
ON CONFLICT (id) DO NOTHING;

-- 4. Sustainability Metrics Table
CREATE TABLE IF NOT EXISTS sustainability_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE UNIQUE NOT NULL,
  digital_passes_count INTEGER DEFAULT 0,
  paper_saved_sheets INTEGER DEFAULT 0,
  carbon_saved_kg DOUBLE PRECISION DEFAULT 0.0,
  energy_kwh DOUBLE PRECISION DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sustainability_metric_date ON sustainability_metrics(metric_date DESC);
