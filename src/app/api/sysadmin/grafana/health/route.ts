import { NextRequest, NextResponse } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { grafanaHealth, MONITORING_GRAFANA_URL } from "@/lib/monitoring";

/**
 * GET /api/sysadmin/grafana/health — probe Grafana so the UI can render an
 * explicit "unavailable" state (never fake data). SysAdmin-only.
 */
export const dynamic = "force-dynamic";

async function handleGet(_req: NextRequest) {
  const data = await grafanaHealth();
  return NextResponse.json({
    success: true,
    data: {
      reachable: data.reachable,
      version: data.version ?? null,
      error: data.error ?? null,
      configuredUrl: Boolean(MONITORING_GRAFANA_URL),
    },
  });
}

export const GET = withApiChain(handleGet, {
  route: "/api/sysadmin/grafana/health",
  auth: "user",
  requiredRole: ["sysadmin", "admin"],
  rateLimit: { keyPrefix: "grafana_health", maxRequests: 60, windowMs: 60_000 },
});
