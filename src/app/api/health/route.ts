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
  return NextResponse.json(sanitized, { status: statusCodes[health.status] ?? 200 });
}

export const GET = withRateLimit(handleGet, { keyPrefix: "health_check", maxRequests: 60 });