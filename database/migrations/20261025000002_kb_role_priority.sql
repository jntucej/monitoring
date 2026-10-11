
-- Adds role-based priority to KB documents and logging for retrieval analysis.
-- Everything here is additive, no schema breaks.

-- Expose the effective visibility level of a doc for admin review tooling.
ALTER TABLE public.kb_documents
  ADD COLUMN IF NOT EXISTS min_level INTEGER NOT NULL DEFAULT 0;

-- Populate from the roles array (best-effort).
UPDATE public.kb_documents d
   SET min_level = COALESCE((
     SELECT MIN(t.level)
       FROM unnest(d.roles) r(role)
       JOIN (VALUES
         ('sysadmin',100),('principal',90),('vice_principal',85),('admin',80),
         ('warden',70),('hostel_manager',65),('deputy_warden',62),('caretaker',60),
         ('hod',58),('exam_branch',56),('oie',54),
         ('supervisor',45),('faculty',40),('staff',35),
         ('operator',30),
         ('parent',25),('guardian',25),('student',20),('worker',20),('visitor',10),
         ('all',0)
       ) AS t(role, level) ON t.role = r.role
   ), 0)
 WHERE min_level = 0;

CREATE INDEX IF NOT EXISTS idx_kb_docs_min_level ON public.kb_documents(min_level);

-- Rank-retrieval log so admins can see which docs served which roles.
CREATE TABLE IF NOT EXISTS public.bot_retrieval_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      UUID REFERENCES public.bot_messages(id) ON DELETE CASCADE,
  chunk_id        UUID REFERENCES public.kb_chunks(id) ON DELETE SET NULL,
  caller_role     TEXT NOT NULL,
  matched_role    TEXT,
  raw_score       NUMERIC(6,4) NOT NULL,
  weighted_score  NUMERIC(6,4) NOT NULL,
  rank            INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_rlog_msg  ON public.bot_retrieval_log(message_id);
CREATE INDEX IF NOT EXISTS idx_bot_rlog_role ON public.bot_retrieval_log(caller_role, created_at DESC);

ALTER TABLE public.bot_retrieval_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='bot_retrieval_log' AND policyname='svc_all_bot_retrieval_log'
  ) THEN
    CREATE POLICY svc_all_bot_retrieval_log ON public.bot_retrieval_log
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
