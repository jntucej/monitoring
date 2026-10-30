-- ============================================================================
-- Migration: Add missing gate_claim_codes table
-- Purpose: The gate claim-code feature (20261226000001) references this
--          table, but the table was never created in the live schema.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.gate_claim_codes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_hash     TEXT NOT NULL,
    gate_id       UUID NOT NULL,
    operator_name_label TEXT,
    generated_by  UUID,
    expires_at    TIMESTAMPTZ NOT NULL,
    used_at       TIMESTAMPTZ,
    used_by       UUID,
    revoked       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT gate_claim_codes_gate_fk
        FOREIGN KEY (gate_id) REFERENCES public.gates (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS gate_claim_codes_lookup
    ON public.gate_claim_codes (code_hash, gate_id, revoked, used_at);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gate_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.gate_claim_codes TO gate_app;
  END IF;
END $$;

COMMIT;
