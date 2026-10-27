-- Supervisor gate-claim codes.
--
-- A supervisor generates a one-time, human-readable claim string (not just a
-- number — a 16-char Crockford-safe token with dashes) and hands it to an
-- operator. The operator enters it at the kiosk / operator console to claim
-- a gate. Only the SHA-256 hash of the code is stored; the plaintext is
-- returned exactly once at generation time so it can be shown / copied.
--
-- A code is:
--   * scoped to exactly one gate (gate_id)
--   * one-use (used_at set on claim; further attempts fail)
--   * revocable (revoked flag)
--   * expiring (default 24h from creation, set at generation)

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

-- One matching hash + gate is enough to drive lookups; the claim endpoint
-- hashes the entered code and matches on (code_hash, gate_id).
CREATE INDEX IF NOT EXISTS gate_claim_codes_lookup
    ON public.gate_claim_codes (code_hash, gate_id, revoked, used_at);
CREATE INDEX IF NOT EXISTS gate_claim_codes_gate
    ON public.gate_claim_codes (gate_id, created_at DESC);

COMMIT;
