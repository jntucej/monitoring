-- Migration 0011: Monitoring, Auditing & Backup Tables

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name VARCHAR(100),
    user_role VARCHAR(50),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create api_metrics table
CREATE TABLE IF NOT EXISTS api_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER NOT NULL, -- in milliseconds
    error TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create system_alerts table
CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create backups table
CREATE TABLE IF NOT EXISTS backups (
    id VARCHAR(100) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    size BIGINT NOT NULL,
    table_count INTEGER NOT NULL,
    record_count INTEGER NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
    error TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_api_metrics_path ON api_metrics(path);
CREATE INDEX IF NOT EXISTS idx_api_metrics_timestamp ON api_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_metrics_status_code ON api_metrics(status_code);

CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved ON system_alerts(resolved);

-- RLS Policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

-- Admins & Super Admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM persons 
            WHERE persons.id = auth.uid() 
            AND persons.person_type IN ('admin', 'superadmin', 'security_head')
        )
    );

-- Admins can view api_metrics
CREATE POLICY "Admins can view api_metrics" ON api_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM persons 
            WHERE persons.id = auth.uid() 
            AND persons.person_type IN ('admin', 'superadmin')
        )
    );

-- Admins can view and resolve system_alerts
CREATE POLICY "Admins can view system_alerts" ON system_alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM persons 
            WHERE persons.id = auth.uid() 
            AND persons.person_type IN ('admin', 'superadmin')
        )
    );

-- Admins can manage backups
CREATE POLICY "Admins can manage backups" ON backups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM persons 
            WHERE persons.id = auth.uid() 
            AND persons.person_type IN ('admin', 'superadmin')
        )
    );
