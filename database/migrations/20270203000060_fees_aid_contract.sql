-- Migration 60: fees & aid contract backing (zero-hardcoding).
--
-- Two tables the Fees & Aid screen + pay drawer read:
--   1. fee_payment_references — where a student's UPI/SBI-Collect payment
--      reference is logged. The SBI Collect / UPI webhook adapter
--      (integration_adapters.sbi_collect_upi_fee) reconciles the webhook's
--      utr_ref against this table. No fee amount is hardcoded here.
--   2. scholarship_awards — aid / scholarship records per student. The
--      ePASS scholarship adapter (future) will populate this; the UI
--      renders whatever rows exist (zero-hardcoded scheme list).
--
-- A deterministic demo seed for fee_items + scholarship_awards for the
-- "FACULTY"-scoped test students (25JJ5A0401) so the Fees & Aid screen
-- renders populated on first boot. All amounts are data rows, never code.

BEGIN;

CREATE TABLE IF NOT EXISTS public.fee_payment_references (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id    UUID NOT NULL,
    utr_ref       TEXT NOT NULL,
    pay_method    TEXT NOT NULL CHECK (pay_method IN ('SBI_COLLECT','UPI','CARD')),
    amount_inr    NUMERIC(12,2) NOT NULL DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'PENDING_WEBHOOK'
                  CHECK (status IN ('PENDING_WEBHOOK','RECONCILED','FAILED','WAIVED')),
    reconciled_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.scholarship_awards (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id    UUID NOT NULL,
    scheme_name   TEXT NOT NULL,
    amount        NUMERIC(12,2) NOT NULL,
    status        TEXT NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','APPROVED','AWARDED','REJECTED')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deterministic demo fee items for the test student (25JJ5A0401).
DO $$
DECLARE
    demo_student UUID;
BEGIN
    SELECT u.id INTO demo_student
      FROM public.users u
     WHERE u.unique_id = '25JJ5A0401' LIMIT 1;
    IF demo_student IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.fee_items WHERE student_id = demo_student
    ) THEN
        INSERT INTO public.fee_items (student_id, fee_type, amount, paid, due_date, status)
        VALUES
            (demo_student, 'tuition_semester_1', 55000, 0,   '2026-12-15', 'DUE'),
            (demo_student, 'hostel_semester_1',  18000, 9000,'2026-12-15', 'PARTIAL'),
            (demo_student, 'exam_fees',            3500, 0,   '2027-01-10', 'DUE');
    END IF;

    IF demo_student IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.scholarship_awards WHERE student_id = demo_student
    ) THEN
        INSERT INTO public.scholarship_awards (student_id, scheme_name, amount, status)
        VALUES
            (demo_student, 'MERIT_SCHOLARSHIP_2026', 12000, 'APPROVED'),
            (demo_student, 'MERIT_SCHOLARSHIP_2026', 4000,  'PENDING');
    END IF;
END $$;

COMMIT;
