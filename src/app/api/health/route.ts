import { NextResponse } from "next/server";
import { checkSystemHealth } from "@/lib/health";
import { withRateLimit } from "@/lib/rate-limit";

async function handleGet() {
  const health = await checkSystemHealth();
  
  const statusCodes = {
    healthy: 200,
    degraded: 200,
    unhealthy: 503,
  };
  
  return NextResponse.json(health, { status: statusCodes[health.status] || 200 });
}

export const GET = withRateLimit(handleGet, { keyPrefix: "health_check", maxRequests: 60 });
