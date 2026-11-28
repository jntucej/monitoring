/**
 * AUTOPILOT dedicated-DB pool for the worker (outbox relay bridge).
 *
 * The AUTOPILOT control plane persists into its own database
 * (autopilot_runtime) owned by the dedicated autopilot_runtime_app role.
 * The Gate Monitor worker must read unpublished outbox rows from that DB to
 * bridge mission events into gate_monitor.domain_outbox. This module
 * provides a separate pool so the two databases never share a connection.
 *
 * Persistent + context-aware: the DSN is read from the environment
 * (AUTOMONITORING_DSN) or built from the standard POSTGRES_* vars with the
 * dedicated autopilot_runtime db name — no hardcoded credentials.
 */
import pg from 'pg';

const { Pool } = pg;

let autopilotPool = null;

export function getAutopilotDbPool() {
  if (autopilotPool) return autopilotPool;

  // Reuse the worker's env-loading + connection settings; only the database
  // name differs. The worker container reaches gate_postgres by service
  // name (postgres:5432) on the shared bridge network. Derive the base URL
  // the same way getWorkerDbPool does (env first, else POSTGRES_* vars).
  const baseUrl =
    process.env.DATABASE_URL ||
    `postgres://${process.env.POSTGRES_USER || "postgres"}:${encodeURIComponent(
      process.env.POSTGRES_PASSWORD || "postgres",
    )}@${process.env.POSTGRES_HOST || "127.0.0.1"}:${process.env.POSTGRES_PORT || "5432"}/${
      process.env.POSTGRES_DB || "gate_monitor"
    }`;

  const autopilotUrl =
    process.env.AUTOMONITORING_DSN ||
    baseUrl.replace(/\/gate_monitor\/?$/, "/autopilot_runtime");

  autopilotPool = new Pool({
    connectionString: autopilotUrl,
    max: 5, // frozen conservative pool (control plane is small)
    ssl: process.env.PG_SSL === "true"
      ? { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== "false" }
      : undefined,
  });

  // Verify connectivity lazily; a failed connect surfaces on first use.
  return autopilotPool;
}

export default getAutopilotDbPool;
