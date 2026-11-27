import { NextRequest, NextResponse } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { createAiRuntime } from "@model-runtime";

/**
 * GET /api/sysadmin/operations/agent-status
 *
 * Health probe for the worker's ops-agent (127.0.0.1:3002 in dev,
 * worker:3002 in Docker). Returns { reachable, uptime_s, registered_ops }.
 *
 * Read-only, sysadmin + admin only.
 */

// The ops-agent binds 127.0.0.1:3002 inside the gate_worker container. Use
// the resolvable hostname `gate_worker` (container_name) — bare `worker` does
// not resolve from the web container. Override with OPS_AGENT_URL if needed.
const OPS_AGENT_URL = process.env.OPS_AGENT_URL || "http://gate_worker:3002";

async function handleGet(_req: NextRequest) {
  let opsAgent = { reachable: false, uptime_s: null as number | null, registered_ops: [] as string[] };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch(`${OPS_AGENT_URL}/health`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) {
      opsAgent = { reachable: false, uptime_s: null, registered_ops: [] };
    } else {
      const j = await r.json();
      opsAgent = { reachable: true, uptime_s: j?.uptime ?? null, registered_ops: j?.ops ?? [] };
    }
  } catch {
    opsAgent = { reachable: false, uptime_s: null, registered_ops: [] };
  }

  // §8/§16/§17 — surface the AI resource-manager state (host RAM pressure,
  // heavy-model leases, eviction). Read-only; no model I/O, no secrets. The
  // resource manager degrades safely (ample pressure) if node:os is absent.
  let ai_status: unknown = null;
  try {
    const rt = createAiRuntime();
    ai_status = rt.aiStatus();
  } catch {
    ai_status = { error: "ai runtime unavailable" };
  }

  return ok({ ...opsAgent, ai_status });
}

export const GET = withApiChain(handleGet, {
  route: "/api/sysadmin/operations/agent-status",
  auth: "user",
  requiredRole: ["sysadmin", "admin"],
  rateLimit: { keyPrefix: "sysadmin_agent_status", maxRequests: 120 },
});
