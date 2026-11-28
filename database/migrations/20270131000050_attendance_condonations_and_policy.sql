-- Migration 50: attendance condonations + credit-promotion + non-credit status.
--
-- Adapted to the deployed data model (NOT the spec's fictional JJR23 table):
--   * The 75% exam-eligibility threshold lives in config_exam_eligibility_rules
--     (already the source of truth; do NOT duplicate it here).
--   * Aggregate attendance is real, from attendance_records.
--   * These three tables ADD the condonation workflow + two supporting policy
--     ledgers. Nothing here is hardcoded into the frontend.
--
-- All new, additive, idempotent. No changes to existing tables.

-- 0. Extend the live source-of-truth table with a condonation floor so the
--    65% band is ALSO DB-driven (a future circular can change it, no code).
--    Idempotent: only adds the column if missing.
ALTER TABLE public.config_exam_eligibility_rules
  ADD COLUMN IF NOT EXISTS condonation_min_pct NUMERIC(5,2) NOT NULL DEFAULT 65.00;

-- 1. Attendance condonations (Student -> HOD -> CAC/Principal chain).
--    aggregate_pct is stored as reported at submission; the eligibility BAND
--    (65 <= pct < 75) is enforced by the policy engine reading
--    config_exam_eligibility_rules, NOT by a rigid CHECK, so a future circular
--    can change the thresholds without a schema change.
CREATE TABLE IF NOT EXISTS public.attendance_condonations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  regulation_code       TEXT NOT NULL DEFAULT 'R25',      -- matches academic_regulations.code style
  academic_year         TEXT NOT NULL,
  semester              INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
  aggregate_pct         NUMERIC(5,2) NOT NULL,
  grounds_category      TEXT NOT NULL CHECK (grounds_category IN ('MEDICAL','INSTITUTIONAL_DEPUTATION')),
  absence_from          DATE NOT NULL,
  absence_to            DATE NOT NULL,
  missed_hours          INT NOT NULL CHECK (missed_hours > 0),
  proof_storage_key     TEXT,
  fee_challan_ref       TEXT,
  fee_cleared           BOOLEAN NOT NULL DEFAULT false,
  status                TEXT NOT NULL DEFAULT 'PENDING_HOD' CHECK (
                        status IN ('PENDING_HOD','PENDING_CAC','APPROVED','REJECTED')),
  hod_endorsed_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  hod_endorsed_at       TIMESTAMPTZ,
  cac_resolution_no     TEXT,
  cac_decided_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  cac_decided_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_condonations_student
  ON public.attendance_condonations (student_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_condonations_hod
  ON public.attendance_condonations (hod_endorsed_by) WHERE hod_endorsed_by IS NOT NULL;

-- 2. Credit promotion rules (regular vs lateral-entry ladders).
--    regulation_code references the EXISTING academic_regulations.code (R22/R25).
CREATE TABLE IF NOT EXISTS public.credit_promotion_rules (
  regulation_code   TEXT NOT NULL REFERENCES public.academic_regulations(code),
  entry_type        TEXT NOT NULL CHECK (entry_type IN ('REGULAR','LATERAL_ENTRY')),
  from_year         INT NOT NULL,
  from_sem          INT NOT NULL,
  to_year           INT NOT NULL,
  to_sem            INT NOT NULL,
  min_credits_req   INT NOT NULL,
  total_credits_ref INT NOT NULL,
  PRIMARY KEY (regulation_code, entry_type, from_year, from_sem)
);

-- Seed the R25 ladders (regular 160-credit + lateral 120-credit). Idempotent.
INSERT INTO public.credit_promotion_rules
  (regulation_code, entry_type, from_year, from_sem, to_year, to_sem, min_credits_req, total_credits_ref)
VALUES
  ('R25','REGULAR',      1,2, 2,1, 20, 40),
  ('R25','REGULAR',      2,2, 3,1, 48, 80),
  ('R25','REGULAR',      3,2, 4,1, 72, 120),
  ('R25','LATERAL_ENTRY',2,2, 3,1, 24, 40),
  ('R25','LATERAL_ENTRY',3,2, 4,1, 48, 80)
ON CONFLICT DO NOTHING;

-- 3. Mandatory non-credit courses + NSS/NCC tracking (0 credits, pass/fail,
--    degree prerequisite). course_type MANDATORY_COURSE needs cie_marks >= 40;
--    NSS_NCC needs attendance_pct >= 65.
CREATE TABLE IF NOT EXISTS public.student_non_credit_status (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_code       TEXT NOT NULL,
  course_type       TEXT NOT NULL CHECK (course_type IN ('MANDATORY_COURSE','NSS_NCC')),
  cie_marks         NUMERIC(5,2) DEFAULT 0,
  attendance_pct    NUMERIC(5,2) DEFAULT 0,
  result_status     TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (
                    result_status IN ('IN_PROGRESS','PASS','FAIL','SATISFACTORY','UNSATISFACTORY')),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, course_code)
);

CREATE INDEX IF NOT EXISTS idx_student_non_credit_status_student
  ON public.student_non_credit_status (student_id);
