import { NextRequest, NextResponse } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import { hasSystemPermission } from "@/lib/sysadmin/permissions";
import crypto from "node:crypto";

/**
 * POST /api/sysadmin/operations
 *
 * Proxies allowlisted infrastructure operations to the worker's restricted
 * ops-agent (127.0.0.1:3002 or worker:3002 in Docker).
 *
 * The web container is NOT given Docker socket or root access. All
 * privileged operations are handled by the ops-agent, which uses its
 * own allowlist and audit log. The web layer only forwards the request
 * and records the audit event.
 *
 * Request body: { action: string, params?: Record<string, unknown> }
 * Response:      { ok: boolean, operation: string, result: object | null, error?: string }
 */

// The ops-agent binds 127.0.0.1:3002 inside the gate_worker container. The
// resolvable service hostname from the web container is `gate_worker` (the
// container_name) — the bare compose service name `worker` does NOT resolve in
// this topology. Override with OPS_AGENT_URL if the network changes.
const OPS_AGENT_URL =
  process.env.OPS_AGENT_URL || "http://gate_worker:3002";

const ALLOWED_OPS = new Set([
  "retry_failed_notifications",
  "refresh_infra_snapshot",
  "verify_latest_backup",
  "list_backups",
  "restart_container",
  "get_container_logs",
  "host_diagnostics",
]);

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  if (!hasSystemPermission(auth.role, "system.workers.retry")) {
    return fail("FORBIDDEN", "System administration permission required", 403);
  }

  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? "").trim();
  const params = (body?.params ?? {}) as Record<string, unknown>;

  if (!ALLOWED_OPS.has(action)) {
    return fail("INVALID_ACTION", `Operation '${action}' is not in the allowlist`, 400);
  }

  // Rate-limit the ops-agent call to prevent abuse
  const requestId = crypto.randomUUID();
  const agentSecret = process.env.OPS_AGENT_SECRET || "";

  let agentRes: Response | null = null;
  try {
    agentRes = await fetch(`${OPS_AGENT_URL}/ops/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${agentSecret}`,
        "X-Request-Id": requestId,
      },
      body: JSON.stringify({ ...params, actor: auth.userId, request_id: requestId }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    await addAudit({
      action: "SYSADMIN_OP_AGENT_UNREACHABLE",
      userId: auth.userId,
      role: auth.role,
      details: { action, requestId, error: err instanceof Error ? err.message : "ops-agent unreachable" },
    });
    return fail("OPS_AGENT_UNREACHABLE", "Infrastructure operations agent is offline — monitoring remains available", 503);
  }

  const agentJson = await agentRes.json().catch(() => null);

  if (!agentRes.ok || !agentJson?.ok) {
    const errMsg = agentJson?.error ?? `ops-agent returned ${agentRes.status}`;
    await addAudit({
      action: "SYSADMIN_OP_FAILED",
      userId: auth.userId,
      role: auth.role,
      details: { action, requestId, error: errMsg },
    });
    return fail("OPERATION_FAILED", errMsg, 500);
  }

  await addAudit({
    action: `SYSADMIN_OP_${action.toUpperCase()}`,
    userId: auth.userId,
    role: auth.role,
    details: { requestId, result: agentJson.result },
  });

  return ok({ operation: action, result: agentJson.result, requestId });
}

export const POST = withApiChain(handlePost, {
  route: "/api/sysadmin/operations",
  auth: "user",
  csrf: true,
  requiredRole: ["sysadmin"],
  rateLimit: { keyPrefix: "sysadmin_operations", maxRequests: 30 },
});
