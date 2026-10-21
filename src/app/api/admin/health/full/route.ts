// src/app/api/admin/health/full/route.ts
// GET /api/admin/health/full
//
// The rich system-health payload that used to be served publicly at
// /api/health. It now requires an admin/sysadmin session, so external
// scanners cannot enumerate topology, load, active sessions, or alert
// UUIDs. The public /api/health still returns a single `status` field
// for uptime monitors and the docker-compose healthcheck.

import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { checkSystemHealth } from "@/lib/health";

const statusCodes: Record<string, number> = {
  healthy: 200,
  degraded: 200, // still operational (a gateway may be offline)
  unhealthy: 503,
};

async function handler(_req: NextRequest) {
  const health = await checkSystemHealth();
  const sanitize = (h: typeof health): typeof h => ({
    status: h.status,
    timestamp: h.timestamp,
    uptime: h.uptime,
    components: {
      database: {
        status: h.components.database.status,
        latency: h.components.database.latency,
        ...(h.components.database.error
          ? { error: "Database unavailable" }
          : {}),
      },
      redis: {
        status: (h.components as any).redis?.status ?? "healthy",
        latency: (h.components as any).redis?.latency ?? 0,
        ...(((h.components as any).redis?.error)
          ? { error: "Redis unavailable" }
          : {}),
      },
      gateways: {
        status: h.components.gateways.status,
        online: h.components.gateways.online,
        offline: h.components.gateways.offline,
        total: h.components.gateways.total,
      },
      services: {
        status: h.components.services.status,
        auth: { status: h.components.services.auth?.status ?? "healthy" },
        worker: { status: h.components.services.worker?.status ?? "healthy" },
      },
      ...(h.components.env
        ? {
            env: {
              status: h.components.env.status,
              ...(h.components.env.error
                ? { error: "Environment misconfigured" }
                : {}),
            },
          }
        : {}),
    },
    metrics: h.metrics,
    recentAlerts: h.recentAlerts,
  });

  return NextResponse.json(sanitize(health), {
    status: statusCodes[health.status] ?? 200,
  });
}

export const GET = withAuthorization(handler, {
  requiredRole: ["sysadmin", "admin"],
});
