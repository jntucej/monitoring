import { NextRequest } from "next/server";
import { getHealth } from "@/server/services/health/check";
import { sanitizeHealth } from "@/server/policy/health/sanitize";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";

async function handleGet(_req: NextRequest) {
  const health = await getHealth();
  const sanitized = sanitizeHealth(health);

  const statusCodes: Record<string, number> = {
    healthy: 200,
    degraded: 200,
    unhealthy: 503,
  };

  return ok(sanitized, statusCodes[health.status] ?? 200);
}

export const GET = withRateLimit(handleGet, { keyPrefix: "health_check", maxRequests: 60 });
