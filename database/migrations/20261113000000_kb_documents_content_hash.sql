
-- Content-hash column for KB document dedupe (ingest script upserts by source).
-- Additive: nullable, no schema breaks.
ALTER TABLE public.kb_documents
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_kb_docs_source ON public.kb_documents(source);
