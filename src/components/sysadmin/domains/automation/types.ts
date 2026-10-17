/**
 * Automation domain types — shared wire shapes for the sysadmin automation
 * pages (Jobs, Deployments, Maintenance).
 *
 * All types mirror the payload returned by the respective
 * `/api/admin/<category>/overview` route.
 *
 * `ok()` from `@/server/http/response` wraps the payload in `{ data: T }`,
 * so `useDashboardData` should be typed as `{ data: <Category>Data }`.
 */

// ── Jobs ───────────────────────────────────────────────────────────────────────

/** Row-level entity for the Jobs drawer (kept for the pre-existing scaffold
 *  drawer wrapper). */
export interface JobsEntity {
  id: string;
  name: string;
  successRate14d: number;
  avgDurationMs: number;
  runs14d: number;
}

export interface JobsData {
  healthy_pct: number;
  failed_24h: number;
  avg_duration_ms: number;
  dlq: number;
  /** Job × day run matrix. data[rowIdx][colIdx] = run count for the day;
   *  the UI recolors cells as green/amber/red based on 0/1/2+ runs. */
  runs_matrix: {
    rows: string[];
    cols: string[];
    data: number[][];
  };
}

// ── Deployments ──────────────────────────────────────────────────────────────

/** Row-level entity for the Deployments drawer. */
export interface DeploymentsEntity {
  id: string;
  version: string | null;
  message: string | null;
  source: string;
  commit: string | null;
  status: string;
  created_at: string;
}

export interface DeploymentRow {
  id: string;
  version: string | null;
  message: string | null;
  source: string;
  commit: string | null;
  status: string;
  created_at: string;
}

export interface DeploymentsData {
  deployments: DeploymentRow[];
  kpis: {
    lastDeployAt: string | null;
    healthGatePassPct: number;
    rollbacks30d: number;
    leadTimeAvgMin: number;
  };
}

// ── Maintenance ──────────────────────────────────────────────────────────────

/** Row-level entity for the Maintenance drawer. */
export interface MaintenanceEntity {
  id: string;
  title: string;
  type: string;
  status: string;
  start_at: string | null;
  end_at: string | null;
}

export interface MaintenanceWindow {
  id: string;
  title: string;
  type: string;
  status: string;
  start_at: string | null;
  end_at: string | null;
  scope: string | null;
  notifications_sent: number;
}

export interface MaintenanceGanttRow {
  id: string;
  title: string;
  type: string;
  status: string;
  dayStart: number;
  dayEnd: number;
  startAt: string | null;
  endAt: string | null;
}

export interface MaintenanceData {
  windows: MaintenanceWindow[];
  gantt: MaintenanceGanttRow[];
  kpis: {
    scheduled: number;
    inProgress: number;
    nextWindowStartsIn: string | null;
    nextWindowCountdown: string | null;
    notificationsSent: number;
  };
}

// ── Envelope aliases for useDashboardData ───────────────────────────────────
// ok() from @/server/http/response wraps in { data: T }.
// useDashboardData<{ data: T }> then .data.data gives T.

export type JobsEnvelope = { data: JobsData };
export type DeploymentsEnvelope = { data: DeploymentsData };
export type MaintenanceEnvelope = { data: MaintenanceData };
