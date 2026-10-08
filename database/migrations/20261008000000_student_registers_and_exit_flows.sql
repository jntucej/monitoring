-- ============================================================================
-- Migration: Student Registers and Canonical Exit Flows + Staff Category Support
--
-- Canonical 4 student exit flows:
--   daily_outing  (no pass) — short local outing
--   home_in       (no pass) — return from home visit
--   home_out      (pass)    — overnight/multi-day home leave
--   day_pass      (pass)    — full day out
--
-- Staff registers:
--   Register A    — Teaching / Faculty / Asst Prof
--   Register B    — Non-teaching / Support / Service
-- ============================================================================

-- 1. Extend config_exit_reasons table columns
ALTER TABLE public.config_exit_reasons
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approval_by TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS parent_notification TEXT NOT NULL DEFAULT 'silent',
  ADD COLUMN IF NOT EXISTS max_duration_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS applicable_to TEXT[] NOT NULL DEFAULT ARRAY['student'];

ALTER TABLE public.config_exit_reasons
  DROP CONSTRAINT IF EXISTS config_exit_reasons_applicable_to_check;

ALTER TABLE public.config_exit_reasons
  ADD CONSTRAINT config_exit_reasons_applicable_to_check
  CHECK (applicable_to <@ ARRAY['student','faculty','staff','worker','visitor']::TEXT[]);

-- 2. Seed / Upsert canonical exit reasons
INSERT INTO public.config_exit_reasons (
  code,
  name,
  description,
  requires_approval,
  approval_by,
  parent_notification,
  max_duration_hours,
  applicable_to,
  is_active
) VALUES
  ('daily_outing', 'Daily Outing', 'Standard local daily outing (no pass required)', FALSE, 'none', 'silent', 4, ARRAY['student'], TRUE),
  ('home_in', 'Home In', 'Return to campus from home visit', FALSE, 'none', 'silent', NULL, ARRAY['student'], TRUE),
  ('home_out', 'Home Out', 'Weekend/overnight leave (requires warden approved pass)', TRUE, 'warden', 'sms', 48, ARRAY['student'], TRUE),
  ('day_pass', 'Day Pass', 'Full day leave (requires warden approved pass)', TRUE, 'warden', 'sms', 12, ARRAY['student'], TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  requires_approval = EXCLUDED.requires_approval,
  approval_by = EXCLUDED.approval_by,
  parent_notification = EXCLUDED.parent_notification,
  max_duration_hours = EXCLUDED.max_duration_hours,
  applicable_to = EXCLUDED.applicable_to,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 3. Add staff_category column to employee_details if not exists
ALTER TABLE public.employee_details
  ADD COLUMN IF NOT EXISTS staff_category VARCHAR(50);

ALTER TABLE public.employee_details
  DROP CONSTRAINT IF EXISTS employee_details_staff_category_check;

ALTER TABLE public.employee_details
  ADD CONSTRAINT employee_details_staff_category_check
  CHECK (staff_category IS NULL OR staff_category IN (
    'teaching_faculty','assistant_professor','associate_professor','professor','hod',
    'lab_assistant','office_staff','support_staff','security','maintenance',
    'canteen','driver','other'
  ));

-- 4. Widen movement_logs reason check constraint
ALTER TABLE public.movement_logs
  DROP CONSTRAINT IF EXISTS movement_logs_reason_check;

ALTER TABLE public.movement_logs
  ADD CONSTRAINT movement_logs_reason_check CHECK (
    reason IS NULL OR reason IN (
      'Home Out', 'Day Out', 'Leave', 'Regular', 'Outing', 'Emergency',
      'Daily Outing', 'Day Pass', 'Home In', 'Special Leave', 'Weekend Outing',
      'daily_outing', 'home_in', 'home_out', 'day_pass'
    )
  );

-- 5. Widen gate_passes reason check constraint if exists
ALTER TABLE public.gate_passes
  DROP CONSTRAINT IF EXISTS gate_passes_reason_check;

ALTER TABLE public.gate_passes
  ADD CONSTRAINT gate_passes_reason_check CHECK (
    reason IS NULL OR reason IN (
      'Home Out', 'Day Out', 'Leave', 'Regular', 'Outing', 'Emergency',
      'Daily Outing', 'Day Pass', 'Home In', 'Special Leave', 'Weekend Outing',
      'daily_outing', 'home_in', 'home_out', 'day_pass'
    )
  );

-- 6. Performance indexes for register lookups
CREATE INDEX IF NOT EXISTS idx_movement_logs_user_ts
  ON public.movement_logs (user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_movement_logs_reason_ts
  ON public.movement_logs (reason, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_employee_details_staff_category
  ON public.employee_details (staff_category);
