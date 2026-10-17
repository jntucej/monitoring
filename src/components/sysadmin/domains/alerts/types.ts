// Alerts domain — shared wire types for the sysadmin ALERTS + SAFETY pages.
// The generated scaffold entity types (AlertsEntity / SafetyEntity) are kept so
// the pre-existing drawer stubs still compile; the data interfaces below mirror
// the payload returned by the corresponding /api/admin/alerts/.../overview route.

import type { Entity } from "@/types/entities";

// ── Alerts ───────────────────────────────────────────────────────────────────

export interface AlertsFeedRow {
  id: string;
  severity: string;
  title: string;
  message: string;
  gate?: string;
  timestamp: string;
  resolved: boolean;
  heat30: number[];
}

export interface AlertsRuleHeatRow {
  ruleId: string;
  ruleName: string;
  severity: string;
  metric: string;
  cells: number[];
}

export interface AlertsData {
  open: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  /** Mean time to acknowledge (hours). */
  mttah: number;
  /** Mean time to resolve (hours). */
  mttrh: number;
  snoozed: number;
  /** Live feed rows with 30-minute heat strips. */
  feed: AlertsFeedRow[];
  /** Rule × channel fire matrix. data[rowIdx][colIdx] = fire count (0 = quiet). */
  rules_matrix: {
    rows: string[];
    cols: string[];
    data: number[][];
  };
  /** Per-rule 7-day heat rows. */
  rule_heat: AlertsRuleHeatRow[];
}

// ── Safety ───────────────────────────────────────────────────────────────────

export type SafetyGateState = "secure" | "elevated" | "critical";

export interface SafetyGateStateEntry {
  gate_code: string;
  state: SafetyGateState;
}

export interface SafetyIncident {
  id: string;
  title: string;
  severity: string;
  created_at: string;
  resolved: boolean;
}

export interface SafetyData {
  gate_states: SafetyGateStateEntry[];
  incidents: SafetyIncident[];
  open_incidents: number;
}

// ── Runbooks ─────────────────────────────────────────────────────────────────

export interface RunbooksData {
  items: Array<Record<string, unknown> & { id: string }>;
}

export interface RunbooksEntity extends Entity {
  id: string;
  [k: string]: unknown;
}

// ── Scaffold entity stubs (used by pre-existing drawer components) ─────────

export interface AlertsEntity extends Entity {
  id: string;
  [k: string]: unknown;
}

export interface SafetyEntity extends Entity {
  id: string;
  [k: string]: unknown;
}
