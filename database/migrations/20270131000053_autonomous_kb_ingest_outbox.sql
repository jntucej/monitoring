-- Migration 53: Autonomous Campus OS — crash-safe circular ingest outbox
--
-- B3 fix from the master-prompt review: CIRCULAR_PUBLISHED must not depend on
-- a bare `redis.lpush` that silently drops a circular when the ingest worker
-- crashes between RPOP and the pgvector write. This outbox row is the
-- durable hand-off: the RAG-ingest worker claims PENDING rows, writes chunks
-- to institutional_knowledge_chunks, then marks them DONE/FAILED with a
-- retry count. A crash leaves the row PENDING for the next sweep — never lost.

CREATE TABLE IF NOT EXISTS public.campus_kb_ingest_outbox (
  circular_id   UUID PRIMARY KEY,
  ingest_status TEXT NOT NULL DEFAULT 'PENDING'
                CHECK (ingest_status IN ('PENDING','PROCESSING','DONE','FAILED')),
  retry_count   INT NOT NULL DEFAULT 0,
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The ingest worker claims the oldest PENDING row and marks it PROCESSING so
-- two workers never chunk the same circular twice.
CREATE OR REPLACE FUNCTION public.claim_kb_ingest()
RETURNS public.campus_kb_ingest_outbox AS $$
DECLARE
  claimed public.campus_kb_ingest_outbox;
BEGIN
  UPDATE public.campus_kb_ingest_outbox
     SET ingest_status = 'PROCESSING', updated_at = NOW()
   WHERE id = (
       SELECT circular_id FROM public.campus_kb_ingest_outbox
        WHERE ingest_status = 'PENDING'
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
   )
  RETURNING * INTO claimed;
  RETURN claimed;
END;
$$ LANGUAGE plpgsql;

-- Mark a claimed circular done / failed (failed re-queues with a retry cap).
CREATE OR REPLACE FUNCTION public.finish_kb_ingest(
  p_circular_id UUID,
  p_ok BOOLEAN,
  p_error TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  IF p_ok THEN
    UPDATE public.campus_kb_ingest_outbox
       SET ingest_status = 'DONE', last_error = NULL, updated_at = NOW()
     WHERE circular_id = p_circular_id;
  ELSE
    UPDATE public.campus_kb_ingest_outbox
       SET ingest_status = CASE WHEN retry_count >= 3 THEN 'FAILED' ELSE 'PENDING' END,
           retry_count   = retry_count + 1,
           last_error    = p_error,
           updated_at    = NOW()
     WHERE circular_id = p_circular_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
