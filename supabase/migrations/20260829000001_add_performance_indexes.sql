-- Migration: 20260829000001_add_performance_indexes.sql
-- Description: Composite performance indexes for movement_logs and daily_stats queries

-- Movement logs composite indexes for user history and gate filtering
CREATE INDEX IF NOT EXISTS idx_mlogs_user_timestamp ON movement_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mlogs_gate_timestamp ON movement_logs(gate_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mlogs_timestamp_direction ON movement_logs(timestamp DESC, direction);

-- Daily stats composite index for date + gate lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stats_date_gate ON daily_stats(date, gate_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_gate_date ON daily_stats(gate_id, date DESC);
