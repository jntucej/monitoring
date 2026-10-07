-- Create sessions table for PostgreSQL adapter
-- Stores active sessions with refresh tokens for secure logout and revocation
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255) NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    
    CONSTRAINT unique_session_token UNIQUE (session_token),
    CONSTRAINT chk_expires_after_creation CHECK (expires_at > created_at)
);

-- Index for fast lookup by session token (used during logout)
CREATE INDEX IF NOT EXISTS idx_sessions_session_token ON sessions(session_token);

-- Index for cleanup jobs (remove expired sessions)
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Example: Insert sample session for testing
INSERT INTO sessions (user_id, session_token, refresh_token, expires_at, ip_address, user_agent)
VALUES (
    'test_user_123', 
    'test_session_token_abc123', 
    'test_refresh_token_xyz789', 
    CURRENT_TIMESTAMP + INTERVAL '1 hour', 
    '192.168.1.100', 
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
);

-- Cleanup function (to be called periodically)
CREATE OR REPLACE FUNCTION clean_old_sessions() RETURNS void AS $$
BEGIN
    UPDATE sessions SET expires_at = NULL WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;