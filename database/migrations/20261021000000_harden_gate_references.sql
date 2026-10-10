-- database/migrations/20261021000000_harden_gate_references.sql
-- Change movement_logs and daily_stats to RESTRICT deletion of gates.
BEGIN;

ALTER TABLE movement_logs DROP CONSTRAINT IF EXISTS movement_logs_gate_id_fkey;
ALTER TABLE movement_logs ADD CONSTRAINT movement_logs_gate_id_fkey
  FOREIGN KEY (gate_id) REFERENCES gates(id) ON DELETE RESTRICT;

ALTER TABLE daily_stats DROP CONSTRAINT IF EXISTS daily_stats_gate_id_fkey;
ALTER TABLE daily_stats ADD CONSTRAINT daily_stats_gate_id_fkey
  FOREIGN KEY (gate_id) REFERENCES gates(id) ON DELETE RESTRICT;

COMMIT;
