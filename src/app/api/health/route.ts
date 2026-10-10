import { NextRequest, NextResponse } from "next/server";
import { checkSystemHealth } from "@/lib/health";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";

async function handleGet(_req: NextRequest) {
  const startTime = Date.now();
  const health = await checkSystemHealth();
  const duration = Date.now() - startTime;
  
  // Insert this request into metrics with actual response time
  try {
    const ms = Math.round(duration);
    await query(
      `INSERT INTO api_metrics (path, method, response_time, status_code, timestamp)
       VALUES ($1, $2, $3, $4, $5)`,
      ['/api/health', 'GET', ms, 200, new Date().toISOString()]
    ).catch(() => {});
  } catch (e) {
    console.error('[health] Failed to log metrics:', e);
  }

  const statusCodes = {
    healthy: 200,
    degraded: 200,
    unhealthy: 503,
  };

  const sanitize = (h: typeof health): typeof h => ({
    status: h.status,
    timestamp: h.timestamp,
    uptime: h.uptime,
    components: {
      database: {
        status: h.components.database.status,
        latency: h.components.database.latency,
        ...(h.components.database.error ? { error: "Database unavailable" } : {}),
      },
      ...(h.components.redis
        ? {
            redis: {
              status: h.components.redis.status,
              latency: h.components.redis.latency,
              ...(h.components.redis.error ? { error: "Redis unavailable" } : {}),
            },
          }
        : {}),
      gateways: {
        status: h.components.gateways.status,
        online: h.components.gateways.online,
        offline: h.components.gateways.offline,
        total: h.components.gateways.total,
      },
      services: {
        status: h.components.services.status,
        auth: {
          status: h.components.services.auth?.status ?? "healthy",
        },
        worker: {
          status: h.components.services.worker?.status ?? "healthy",
        },
      },
      ...(h.components.env
        ? {
            env: {
              status: h.components.env.status,
              ...(h.components.env.error ? { error: "Environment misconfigured" } : {}),
            },
          }
        : {}),
    },
    metrics: h.metrics,
    recentAlerts: h.recentAlerts,
  });

  return NextResponse.json(sanitize(health), { 
    status: (statusCodes as Record<string, number>)[health.status] ?? 200,
    headers: {
      'X-Response-Time': `${duration}ms`,
    },
  });
}

export const GET = withRateLimit(handleGet, { keyPrefix: "health_check", maxRequests: 60 });
