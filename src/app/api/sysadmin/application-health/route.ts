import { NextRequest, NextResponse } from "next/server";
import { checkSystemHealth } from "@/lib/health";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/sysadmin/application-health
 *
 * Application-level health view (vs server/host level): process uptime,
 * request metrics, auth/worker service status, recent alerts.
 * Server-scoped host telemetry lives in DockerFleetPanel via
 * /api/admin/monitoring (Prometheus); keep the two separated.
 *
 * SysAdmin-only, read-only.
 */
async function handleGet(_req: NextRequest) {
  try {
    const health = await checkSystemHealth();
    const statusCodes: Record<string, number> = { healthy: 200, degraded: 200, unhealthy: 503 };
    return NextResponse.json(
      {
        success: true,
        data: {
          status: health.status,
          timestamp: health.timestamp,
          uptimeSeconds: Math.round(health.uptime),
          metrics: health.metrics,
          services: health.components.services,
          database: {
            status: health.components.database.status,
            latencyMs: health.components.database.latency,
          },
          gateways: health.components.gateways,
          recentAlerts: health.recentAlerts,
        },
      },
      { status: (statusCodes[health.status] ?? 200) }
    );
  } catch (error) {
    console.error("Application health fetch error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load application health" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] }),
  { keyPrefix: "sysadmin_app_health", maxRequests: 120 }
);
