import { NextRequest, NextResponse } from "next/server";
import { checkSystemHealth } from "@/lib/health";
import { promQuery } from "@/lib/monitoring";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/sysadmin/services
 *
 * Container/service status for the Docker & Service Status section.
 * Combines app-level service checks (auth, worker, redis, gateways) from
 * the health engine with container liveness/CPU/memory/restart telemetry
 * from Prometheus (node-exporter cAdvisor metrics) when reachable.
 *
 * When Prometheus is unreachable the endpoint still succeeds: the
 * `containers` field is null and the UI shows the app-level services plus
 * a note. SysAdmin + admin only, read-only.
 */
async function handleGet(_req: NextRequest) {
  const result: Record<string, unknown> = { containers: null, containersError: null };

  // 1) App-level services from the health engine (always available when the app is up)
  try {
    const health = await checkSystemHealth();
    result.services = health.components.services;
    result.redis = (health.components as Record<string, any>).redis ?? { status: "unknown" };
    result.database = {
      status: health.components.database.status,
      latencyMs: health.components.database.latency,
    };
    result.gateways = health.components.gateways;
    result.status = health.status;
  } catch (error) {
    result.servicesError = error instanceof Error ? error.message : "health engine unavailable";
  }

  // 2) Container telemetry from Prometheus (best-effort)
  try {
    const up = await promQuery('count by (name) (container_last_seen{name=~"gate_.*|mon_.*"})');
    const cpu = await promQuery('sum by (name) (rate(container_cpu_usage_seconds_total{name=~"gate_.*|mon_.*"}[5m])) * 100');
    const mem = await promQuery('sum by (name) (container_memory_working_set_bytes{name=~"gate_.*|mon_.*"})');
    const restarts = await promQuery('changes(container_start_time_seconds{name=~"gate_.*|mon_.*"}[1h])');

    const label = (series: unknown) => {
      const arr = Array.isArray(series) ? series : [];
      const map = new Map<string, number>();
      for (const s of arr) {
        const m = s as { metric?: Record<string, string>; value?: [number, string] };
        const name = m.metric?.name ?? "unknown";
        map.set(name, Number(m.value?.[1] ?? 0));
      }
      return map;
    };
    const upMap = label((up as { data?: { result?: unknown[] } }).data?.result);
    const cpuMap = label((cpu as { data?: { result?: unknown[] } }).data?.result);
    const memMap = label((mem as { data?: { result?: unknown[] } }).data?.result);
    const restartMap = label((restarts as { data?: { result?: unknown[] } }).data?.result);

    result.containers = [...upMap.entries()]
      .map(([name]) => ({
        name,
        running: upMap.has(name),
        cpuPercent: cpuMap.has(name) ? Math.round((cpuMap.get(name) ?? 0) * 100) / 100 : 0,
        memoryBytes: memMap.get(name) ?? 0,
        restartsLastHour: restartMap.get(name) ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    result.containersError = error instanceof Error ? error.message : "container telemetry unavailable";
  }

  return NextResponse.json({ success: true, data: result });
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] }),
  { keyPrefix: "sysadmin_services", maxRequests: 120 }
);
