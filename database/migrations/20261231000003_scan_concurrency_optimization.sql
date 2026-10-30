-- Migration: 20261231000003_scan_concurrency_optimization.sql
-- Scenario 4 Hardening: Gate scan queue lock contention optimization
-- Creates composite index to optimize SELECT ... FOR UPDATE in process_gate_scan
-- under high-throughput stampedes (300+ scans/min).

CREATE INDEX IF NOT EXISTS idx_movement_logs_scan_dedup_perf
  ON public.movement_logs (user_id, direction, timestamp DESC)
  WHERE NOT is_manual;

CREATE INDEX IF NOT EXISTS idx_movement_logs_manual_dedup_perf
  ON public.movement_logs (user_id, direction, timestamp DESC)
  WHERE is_manual;
