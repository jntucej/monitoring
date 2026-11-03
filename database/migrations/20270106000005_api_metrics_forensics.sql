-- Batch I4: request-id + forensic columns on api_metrics.
--
-- Today, when something goes wrong, answering "what did this specific
-- request do?" requires cross-referencing timestamps across 4 log
-- sources. The columns below let one request_id pull the full chain:
--
--   request_id   — the X-Request-Id the middleware assigns (or echoes
--                  when the caller supplied one). Stable across retries.
--   route        — the resolved route pattern (e.g. /api/gates/[id])
--                  so forensic queries don't have to re-parse paths.
--   csrf_result  — pass | fail | exempt | missing — set by the CSRF
--                  guard; NULL when the route is outside the guarded
--                  set.
--   rate_limit_hit — true when the 429 response was emitted by the
--                     rate-limit guard for this request.
--
-- Indexes:
--   request_id      — point lookups ("what did this request do")
--   route+timestamp — 5xx drill-down by route pattern
--   csrf_result     — "what CSRF failures happened and who triggered them"

BEGIN;

ALTER TABLE public.api_metrics
  ADD COLUMN IF NOT EXISTS request_id      TEXT,
  ADD COLUMN IF NOT EXISTS route           TEXT,
  ADD COLUMN IF NOT EXISTS csrf_result     TEXT,
  ADD COLUMN IF NOT EXISTS rate_limit_hit  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS user_id         UUID,
  ADD COLUMN IF NOT EXISTS role            TEXT;

CREATE INDEX IF NOT EXISTS idx_api_metrics_request_id
  ON public.api_metrics(request_id)
  WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_api_metrics_5xx_route
  ON public.api_metrics(route, timestamp DESC)
  WHERE status_code >= 500;

CREATE INDEX IF NOT EXISTS idx_api_metrics_csrf_fail
  ON public.api_metrics(timestamp DESC)
  WHERE csrf_result = 'fail';

COMMIT;
