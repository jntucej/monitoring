import { NextRequest, NextResponse } from "next/server";
import { checkSystemHealth } from "@/lib/health";
import { withRateLimit } from "@/lib/rate-limit";

async function handleGet(_req: NextRequest) {
  const health = await checkSystemHealth();

  const statusCodes = {
    healthy: 200,
    degraded: 200,
    unhealthy: 503,
  };

  // Bug 135: this endpoint is public (no auth). Raw Postgres/env error strings can leak
  // table/column/constraint names and connection details. Replace with generic messages;
  // keep the non-sensitive status + latency so operators/monitoring still get the signal.
  const sanitize = (h: typeof health) => ({
    status: h.status,
    timestamp: h.timestamp,
    uptime: h.uptime,
    components: {
      database: {
        status: h.components.database.status,
        latency: h.components.database.latency,
        ...(h.components.database.error ? { error: "Database unavailable" } : {}),
      },
      ...(h.components.redis ? {
        redis: {
          status: h.components.redis.status,
          latency: h.components.redis.latency,
          ...(h.components.redis.error ? { error: "Redis unavailable" } : {}),
        },
      } : {}),
      gateways: {
        status: h.components.gateways.status,
        online: h.components.gateways.online,
        offline: h.components.gateways.offline,
        total: h.components.gateways.total,
      },
      services: {
        status: h.components.services.status,
        auth: {
          status: h.components.services.auth?.status || "healthy",
        },
        worker: {
          status: h.components.services.worker?.status || "healthy",
        },
      },
      ...(h.components.env ? {
        env: {
          status: h.components.env.status,
          ...(h.components.env.error ? { error: "Environment misconfigured" } : {}),
        },
      } : {}),
    },
    metrics: h.metrics,
    recentAlerts: h.recentAlerts,
  });

  return NextResponse.json(sanitize(health), { status: statusCodes[health.status] || 200 });
}

export const GET = withRateLimit(handleGet, { keyPrefix: "health_check", maxRequests: 60 });
