-- ============================================================================
-- 0004 — Thumbprint / biometric verification support
-- ============================================================================
-- Adds per-user thumbprint (fingerprint) verification fields to the `users`
-- table. Only a bcrypt hash of the thumbprint signature/template is stored —
-- the raw biometric data is NEVER persisted or returned by any API.
--
-- Columns:
--   thumbprint_hash         bcrypt hash of the thumbprint signature
--   thumbprint_verified_at  when the thumbprint was last registered
--
-- Safe to run against an existing database. Idempotent.
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS thumbprint_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS thumbprint_verified_at TIMESTAMPTZ;
