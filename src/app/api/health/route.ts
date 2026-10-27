import { NextRequest, NextResponse } from "next/server";

/**
 * Public health endpoint.
 *
 * Returns exactly one field: `status`. This is what external uptime
 * monitors, Cloudflare health checks, and the docker-compose healthcheck
 * need. Nothing else — no uptime, no component latencies, no gateway
 * counts, no active sessions, no request/error rates, no alert UUIDs.
 *
 * The full diagnostic payload is now at /api/admin/health/full and
 * requires an admin/sysadmin session.
 */
async function handleGet(_req: NextRequest) {
  const { checkSystemHealth } = await import("@/lib/health");
  const health = await checkSystemHealth();
  const statusCodes: Record<string, number> = {
    healthy: 200,
    degraded: 200, // still operational (one gateway offline, etc.)
    unhealthy: 503,
  };
  return NextResponse.json(
    { status: health.status },
    {
      status: statusCodes[health.status] ?? 200,
      headers: { "cache-control": "public, max-age=30, s-maxage=30" },
    },
  );
}

export const GET = handleGet;
