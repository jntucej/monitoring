/**
 * HealthData — shared type for the sysadmin Health tabbed page.
 *
 * Mirror of the wire shape returned by GET /api/admin/monitoring/health/overview,
 * wrapped in `{ success: true, data: T }` by `ok()`. Fields are safe defaults
 * (zeros / empty arrays / false) on the server side so the UI can always render.
 */
export interface HealthData {
  app: {
    /** Per-hour error rates over the last 24h (values are 0..1). */
    errorRate24h: number[];
  };
  database: {
    /** Total active Postgres connections. */
    conns: number;
    /** Pools tracked (active count used as proxy). */
    pool: number;
    /** ISO timestamp of the last successful check. */
    last_check: string;
  };
  infra: {
    /** Total containers known to the infra layer. */
    containers: number;
    /** Containers currently running. */
    running: number;
  };
  redis: {
    /** Pending jobs in the queue (0 when unavailable). */
    queue_depth: number;
    /** Whether the worker service is healthy. */
    worker_healthy: boolean;
  };
}

// ── Scaffold-facing entity alias ───────────────────────────────────────────

import type { Entity } from "@/types/entities";

export interface HealthEntity extends Entity {
  id: string;
  [k: string]: unknown;
}
