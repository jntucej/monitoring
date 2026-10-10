import { NextRequest, NextResponse } from "next/server";
import { checkSystemHealth } from "@/lib/health";
import { query } from "@/lib/postgres";

async function handleGet(req: NextRequest) {
  const startTime = Date.now();
  const health = await checkSystemHealth();
  const duration = Math.round(Date.now() - startTime);

  // Log this request's actual response time
  try {
    const result = await query(
      `INSERT INTO api_metrics (path, method, response_time, status_code, timestamp)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['/api/health', 'GET', duration, 200, new Date().toISOString()]
    );
    console.log(`[health] metric inserted: ${duration}ms, id=${result.rows?.[0]?.id}`);
  } catch (e) {
    console.error('[health] metric insert FAILED:', e);
  }

  const statusCodes = { healthy: 200, degraded: 200, unhealthy: 503 };
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
