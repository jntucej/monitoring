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

  // Bug 135: endpointpublic (no auth). Raw Postgres/env error strings leak
  // table/column/constraint names connection details. Replace generic messages;
  // keep non-sensitive status latency operators/monitoring get signal.
  const sanitize = (h: typeof health) => {
    const clone = JSON.parse(JSON.stringify(h));
    if (clone.components) {
      for (const key of ["database", "redis"] as const) {
        const c = clone.components[key];
        if (c && c.error) c.error = `${key} unavailable`;
      }
      if (clone.components.env?.error) clone.components.env.error = "Environment misconfigured";
    }
    return clone;
  };

  const sanitized = sanitize(health);

  // Include key health metrics from the sanitized response
  const response: any = {
    status: (statusCodes as Record<string, number>)[sanitized.status] ?? 200,
    timestamp: sanitized.timestamp,
    uptime: sanitized.uptime,
  };

  // Include database info if available
  if (sanitized.components?.database) {
    response.database = {
      status: sanitized.components.database.status,
      latency: sanitized.components.database.latency,
    };
    if (sanitized.components.database.error) {
      response.database.error = sanitized.components.database.error;
    }
  }

  // Include redis info if available
  if (sanitized.components?.redis) {
    response.redis = {
      status: sanitized.components.redis.status,
      latency: sanitized.components.redis.latency,
    };
    if (sanitized.components.redis.error) {
      response.redis.error = sanitized.components.redis.error;
    }
  }

  // Include gateways info if available
  if (sanitized.components?.gateways) {
    response.gateways = {
      status: sanitized.components.gateways.status,
      online: sanitized.components.gateways.online,
      offline: sanitized.components.gateways.offline,
      total: sanitized.components.gateways.total,
    };
  }

  // Include services info if available
  if (sanitized.components?.services) {
    response.services = {
      status: sanitized.components.services.status,
      auth: sanitized.components.services.auth?.status,
      worker: sanitized.components.services.worker?.status,
    };
  }

  // Include env info if available
  if (sanitized.components?.env) {
    response.env = {
      status: sanitized.components.env.status,
    };
    if (sanitized.components.env.error) {
      response.env.error = sanitized.components.env.error;
    }
  }

  // Include metrics and recent alerts from original response
  if (sanitized.metrics) {
    response.metrics = sanitized.metrics;
  }
  if (sanitized.recentAlerts) {
    response.recentAlerts = sanitized.recentAlerts;
  }

  return NextResponse.json(response, { status: (statusCodes as Record<string, number>)[sanitized.status] ?? 200 });
}

export const GET = withRateLimit(handleGet, { keyPrefix: "health_check", maxRequests: 60 });