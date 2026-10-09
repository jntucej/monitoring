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
  const sanitize = (h: typeof health) => {
    for (const key of ["database", "redis"] as const) {
      const c = h.components[key];
      if (c && c.error) c.error = `${key} unavailable`;
    }
    if (h.components.env?.error) h.components.env.error = "Environment misconfigured";
    return h;
  };

  return NextResponse.json(sanitize(health), { status: statusCodes[health.status] || 200 });
}

export const GET = withRateLimit(handleGet, { keyPrefix: "health_check", maxRequests: 60 });
