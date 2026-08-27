-- Phase 4 Migration: Onboarding Progress Tracking

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  step VARCHAR(100) NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, step)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding_progress(user_id);
