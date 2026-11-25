-- 20270131000019_student_identity_qr.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.student_qr_salts (
  salt_day date PRIMARY KEY,
  salt     text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.student_qr_scan_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL,
  scanned_by   uuid NOT NULL,
  scanner_role text NOT NULL,
  context      text NOT NULL,
  result       text NOT NULL,
  scanned_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_qr_scan_student
  ON public.student_qr_scan_log (student_id, scanned_at DESC);

COMMIT;
