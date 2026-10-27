-- database/migrations/20261229000040_gate_passes_qr_unique.sql
BEGIN;

DELETE FROM public.gate_passes a
USING public.gate_passes b
WHERE a.ctid > b.ctid AND a.qr_code = b.qr_code;

CREATE UNIQUE INDEX IF NOT EXISTS gate_passes_qr_code_unique
  ON public.gate_passes (qr_code);

COMMIT;
