-- ============================================================================
-- 20261020000001_mess_token_unique_and_cleanup
-- Make mess_tokens.token_code UNIQUE (was a plain index), add a partial index
-- for the open-token set, and an index on the QR hash for fast verification.
-- Idempotent: de-duplicates existing rows before adding the constraint.
-- ============================================================================

BEGIN;

-- Guard against existing dupes: keep the most recently created per code.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY token_code ORDER BY created_at DESC) AS rn
    FROM public.mess_tokens
)
DELETE FROM public.mess_tokens WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Replace the plain index with a UNIQUE one.
DROP INDEX IF EXISTS public.idx_mess_tokens_code;
CREATE UNIQUE INDEX idx_mess_tokens_code ON public.mess_tokens (token_code);

-- Partial index for the open (unused, unrevoked, unexpired) token set.
CREATE INDEX IF NOT EXISTS idx_mess_tokens_open
  ON public.mess_tokens (token_code)
  WHERE used_at IS NULL AND revoked_at IS NULL;

-- QR hash verification index.
CREATE INDEX IF NOT EXISTS idx_mess_tokens_qr_hash
  ON public.mess_tokens (qr_payload_hash);

COMMIT;
