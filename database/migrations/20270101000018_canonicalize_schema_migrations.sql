-- 20270101000018_canonicalize_schema_migrations.sql
-- Single owner of the canonical schema_migrations shape.
--
-- Background: 34 migrations each contained an adaptive "does the
-- filename/checksum column exist? add it if not; backfill differently if
-- not" dance, because the tracking table was only ever guaranteed to have
-- (version, applied_at). The result:
--   - 126 rows recorded under a bare 14-digit version with NO filename and
--     NO checksum (one row per migration from before the column-add dance
--     landed), so the runner has to trust them as "applied, no checksum"
--     forever and drift-checking on those rows is meaningless;
--   - 34 migration files carry dead adaptive fallback blocks that will
--     never change the table shape again (the columns now always exist).
--
-- This migration makes the canonical shape GUARANTEED and BACKFILLS the
-- legacy rows so the runner's adaptive fallbacks become dead code (marked
-- as such in scripts/migrate.ts — do NOT delete them yet, see that file's
-- comment, in case of mixed-version installs):
--
--   version    TEXT PRIMARY KEY
--   filename   TEXT NOT NULL       — full migration filename (backfilled from version)
--   applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
--   checksum   TEXT NOT NULL       — sha256 of the applied file where derivable;
--                                    the legacy placeholder 'legacy-no-checksum'
--                                    otherwise (keeps NOT NULL satisfiable,
--                                    clearly flagged, and makes
--                                    check-migrations' drift check honest)
--
-- Backfill rule: for each row with a NULL/missing filename, set it to its
-- version (the only value we have). For each row with a NULL/empty
-- checksum, if a matching file on disk exists the runner stamps its
-- sha256 on the next --force run; this migration sets the placeholder so
-- the column can be NOT NULL without violating any existing row. The
-- runner's "legacy row — no checksum" trust path (scripts/migrate.ts)
-- remains the source of truth for whether a row counts as applied; this
-- migration only canonicalizes the table SHAPE so future drift checks
-- compare real checksums instead of NULL.

BEGIN;

-- Backfill filename for legacy rows (only possible from the version itself —
-- the runner's version-prefix rule is what maps version -> full filename).
UPDATE public.schema_migrations
SET filename = version
WHERE filename IS NULL OR filename = '';

-- Backfill checksum with a flagged placeholder for rows that were recorded
-- without one. The runner stamps the real sha256 on the next --force run
-- (see scripts/migrate.ts "upgrading legacy checksum" path); until then the
-- placeholder keeps the column NOT NULL and honestly signals "legacy, no
-- recorded hash".
UPDATE public.schema_migrations
SET checksum = 'legacy-no-checksum'
WHERE checksum IS NULL OR checksum = '';

-- NOW add the NOT NULL constraints — the backfills above guarantee no
-- existing row violates them (Postgres checks at ALTER time, inside the
-- same transaction).
ALTER TABLE public.schema_migrations
  ALTER COLUMN filename SET NOT NULL,
  ALTER COLUMN checksum  SET NOT NULL;

COMMIT;
