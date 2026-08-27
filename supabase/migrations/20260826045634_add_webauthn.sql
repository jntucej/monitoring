-- ============================================
-- WEB AUTHN CREDENTIALS FOR BIOMETRIC VERIFICATION
-- ============================================

-- Credentials table - stores WebAuthn public keys
CREATE TABLE IF NOT EXISTS webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id BYTEA NOT NULL UNIQUE,
    credential_public_key BYTEA NOT NULL,
    counter BIGINT NOT NULL DEFAULT 0,
    transports TEXT[] DEFAULT '{}',
    aaguid UUID,
    nickname TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    CONSTRAINT unique_user_credential UNIQUE (user_id, credential_id)
);

-- Challenges table - stores one-time challenges with TTL
CREATE TABLE IF NOT EXISTS webauthn_challenges (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webauthn_user ON webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credential_id ON webauthn_credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires ON webauthn_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_user ON webauthn_challenges(user_id);

-- RLS Policies
ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;

-- Users can manage their own credentials
CREATE POLICY "Users manage own credentials" ON webauthn_credentials
    FOR ALL USING (user_id = auth.uid());

-- Users can manage their own challenges
CREATE POLICY "Users manage own challenges" ON webauthn_challenges
    FOR ALL USING (user_id = auth.uid());

-- Service role bypass (for server-side operations)
CREATE POLICY "Service role bypass" ON webauthn_credentials
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass challenges" ON webauthn_challenges
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Comments
COMMENT ON TABLE webauthn_credentials IS 'WebAuthn public key credentials for biometric verification';
COMMENT ON COLUMN webauthn_credentials.credential_id IS 'Raw credential ID from WebAuthn registration';
COMMENT ON COLUMN webauthn_credentials.credential_public_key IS 'COSE-encoded public key for signature verification';
COMMENT ON COLUMN webauthn_credentials.counter IS 'Signature counter for replay attack prevention';
COMMENT ON COLUMN webauthn_credentials.transports IS 'Transport methods supported (internal, usb, ble, hybrid)';