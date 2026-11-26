import { NextRequest, NextResponse } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";

/**
 * GET /api/sysadmin/operations/agent-status
 *
 * Health probe for the worker's ops-agent (127.0.0.1:3002 in dev,
 * worker:3002 in Docker). Returns { reachable, uptime_s, registered_ops }.
 *
 * Read-only, sysadmin + admin only.
 */

const OPS_AGENT_URL = process.env.OPS_AGENT_URL || "http://worker:3002";

async function handleGet(_req: NextRequest) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch(`${OPS_AGENT_URL}/health`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return ok({ reachable: false, uptime_s: null, registered_ops: [] });
    const j = await r.json();
    return ok({
      reachable: true,
      uptime_s: j?.uptime ?? null,
      registered_ops: j?.ops ?? [],
    });
  } catch {
    return ok({ reachable: false, uptime_s: null, registered_ops: [] });
  }
}

export const GET = withApiChain(handleGet, {
  route: "/api/sysadmin/operations/agent-status",
  auth: "user",
  requiredRole: ["sysadmin", "admin"],
  rateLimit: { keyPrefix: "sysadmin_agent_status", maxRequests: 120 },
});
