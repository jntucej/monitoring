import { NextRequest, NextResponse } from "next/server";
import { checkSystemHealth } from "@/lib/health";

async function handleGet(req: NextRequest) {
  const startTime = Date.now();
  const health = await checkSystemHealth();
  const duration = Math.round(Date.now() - startTime);

  // NOTE: /api/health deliberately does NOT write to api_metrics here.
  // The metrics middleware already skips health endpoints (to avoid a
  // self-reinforcing loop), and the dashboard polls this endpoint on an
  // interval — every poll inserting a row used to inflate the
  // "requests per minute" card with its own traffic. The measured
  // duration is still surfaced via the X-Response-Time header below.

  const statusCodes = {
    healthy: 200,
    degraded: 200,  // Degraded is still operational (gateway offline, etc.)
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
      redis: {
        status: (h.components as any).redis?.status ?? "healthy",
        latency: (h.components as any).redis?.latency ?? 0,
        ...((h.components as any).redis?.error ? { error: "Redis unavailable" } : {}),
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
      ...(h.components.env ? {
        env: { status: h.components.env.status, ...(h.components.env.error ? { error: "Environment misconfigured" } : {}) },
      } : {}),
    },
    metrics: h.metrics,
    recentAlerts: h.recentAlerts,
  });

  return NextResponse.json(sanitize(health), {
    status: (statusCodes as Record<string, number>)[health.status] ?? 200,
    headers: { 'X-Response-Time': `${duration}ms` },
  });
}

export const GET = handleGet;
