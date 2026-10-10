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
    const clone = JSON.parse(JSON.stringify(h));
    if (clone.components) {
      if (clone.components.database && clone.components.database.error) {
        clone.components.database.error = "Database unavailable";
      }
      if (clone.components.redis && clone.components.redis.error) {
        clone.components.redis.error = "Redis unavailable";
      }
      if (clone.components.env && clone.components.env.error) {
        clone.components.env.error = "Environment misconfigured";
      }
    }
    return clone;
  };

  return NextResponse.json(sanitize(health), { status: statusCodes[health.status] || 200 });
}

export const GET = withRateLimit(handleGet, { keyPrefix: "health_check", maxRequests: 60 });
