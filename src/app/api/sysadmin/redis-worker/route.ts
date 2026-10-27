import { NextRequest, NextResponse } from "next/server";
import { checkSystemHealth } from "@/lib/health";
import { promQuery } from "@/lib/monitoring";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/sysadmin/redis-worker
 *
 * Redis + background worker service health.
 *
 * Sources:
 *   • redis — /api/health engine (pings the cache layer; reports latency)
 *   • worker — app-level service check (job/queue runner liveness)
 *   • Prometheus — node_exporter redis metrics when reachable; otherwise
 *     the fields are null and the UI shows a data-availability note.
 *
 * SysAdmin + admin only, read-only.
 */
async function handleGet(_req: NextRequest) {
  const data: Record<string, unknown> = {
    redis: null,
    redisDetails: null,
    worker: null,
  };

  // App-level redis + worker status from the health engine
  try {
    const health = await checkSystemHealth();
    const components = health.components as Record<string, any>;
    data.redis = components.redis ?? { status: "unknown" };
    data.worker = components.services?.worker ?? { status: "unknown" };
  } catch (error) {
    data.error = error instanceof Error ? error.message : "health engine unavailable";
  }

  // Redis detail metrics from Prometheus (best-effort)
  try {
    const conn = await promQuery("redis_connected_clients");
    const mem = await promQuery("redis_used_memory_bytes");
    const ops = await promQuery("rate(redis_commands_total[5m])");
    const key = (r: unknown) => {
      const arr = (r as { data?: { result?: Array<{ value?: [number, string] }> } }).data?.result ?? [];
      return arr.length > 0 ? Number(arr[0]?.value?.[1] ?? 0) : null;
    };
    data.redisDetails = {
      connectedClients: key(conn),
      usedMemoryBytes: key(mem),
      opsPerSecond: key(ops),
    };
  } catch {
    // Prometheus unreachable — leave details null; UI shows a note
    data.redisDetails = null;
  }

  return NextResponse.json({ success: true, data });
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] }),
  { keyPrefix: "sysadmin_redis_worker", maxRequests: 60 }
);
