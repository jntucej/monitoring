-- Add session_version column to users table for session invalidation
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
