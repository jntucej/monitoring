/**
 * Next.js instrumentation hook (server runtime only).
 *
 * Fires once on web-server boot. Used today to run the schema-drift
 * guard so an operator sees a loud log line if the container is
 * running code that expects a newer migration than the database has
 * applied. See src/lib/schema-drift-guard.ts.
 *
 * Keep this module side-effect-light: it must not import anything
 * that pulls node-only packages into the client bundle, and it must
 * not block server startup on DB connectivity (the guard is fire-
 * and-forget and handles its own failures).
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Fail closed in production if kiosk is left in open mode without PIN or trusted IP restriction
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.KIOSK_SESSION_REQUIRE_PIN &&
    !process.env.TRUSTED_KIOSK_IPS
  ) {
    console.error(
      "FATAL: KIOSK_SESSION_REQUIRE_PIN=true or TRUSTED_KIOSK_IPS must be set in production to prevent open kiosk mode."
    );
    process.exit(1);
  }

  const { runSchemaDriftGuardOnBoot } = await import("@/lib/schema-drift-guard");
  runSchemaDriftGuardOnBoot();

  // P1-9: RLS posture assertion. After 20261231000005 the intended posture is
  // NOBYPASSRLS on both postgres and gate_app so RLS policies are the active
  // defense-in-depth layer (a hybrid BYPASSRLS state silently zeroes app
  // reads). Detect a regression at boot and log it loudly.
  const { assertRlsPosture } = await import("@/lib/rls-posture-guard");
  assertRlsPosture();

  // P1-pool: fail-closed connection pool budget check. If the configured
  // per-replica pool size × replica count would exceed 80% of the server's
  // max_connections, a misconfigured deploy should refuse to start rather
  // than fall over under exam-day traffic. Non-fatal by default (log only)
  // so a single-replica dev box does not break; set GATE_POOL_STRICT=true
  // to make it a hard exit in CI / blue-green deploys.
  await checkPoolBudget();
}

async function checkPoolBudget(): Promise<void> {
  const { getPostgresPool } = await import("@/lib/postgres");
  const configuredMax = parseInt(process.env.PG_MAX_POOL_SIZE || "20", 10);
  const replicaCount = parseInt(process.env.REPLICA_COUNT || "1", 10);
  try {
    const pool = await getPostgresPool();
    const res = await pool.query("SHOW max_connections");
    const serverMax = parseInt(res.rows[0].max_connections, 10);
    const budget = Math.floor(serverMax * 0.8);
    if (configuredMax * replicaCount > budget) {
      const msg =
        `[pool-budget] OVER-PROVISIONED: PG_MAX_POOL_SIZE=${configuredMax} x ` +
        `REPLICA_COUNT=${replicaCount} = ${configuredMax * replicaCount} connections > ` +
        `budget ${budget} (max_connections=${serverMax} x 0.8). ` +
        `Lower PG_MAX_POOL_SIZE or raise max_connections.`;
      if (process.env.GATE_POOL_STRICT === "true") {
        console.error(msg);
        process.exit(1);
      }
      console.error(msg);
    } else {
      console.log(
        `[pool-budget] ok: ${configuredMax} x ${replicaCount} replicas = ` +
        `${configuredMax * replicaCount} <= budget ${budget} (max_connections=${serverMax})`
      );
    }
  } catch (err) {
    console.warn(
      "[pool-budget] check skipped (DB unreachable at boot):",
      (err as Error).message
    );
  }
}
