// /api/operator/gate/device-health/route.ts
// Operator one-click "device down" report. Writes an alert so the
// supervisor sees it in gate-live; marks the gate's device degraded in
// gate_logs context.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as {
    gateId?: string;
    device?: string;
    status?: string;   // DOWN | DEGRADED | RECOVERED
    note?: string;
  } | null;
  if (!body?.gateId || !body.status) {
    return fail("VALIDATION_ERROR", "gateId and status (DOWN|DEGRADED|RECOVERED) required", 400);
  }
  const status = body.status.toUpperCase();
  if (!["DOWN", "DEGRADED", "RECOVERED"].includes(status)) {
    return fail("VALIDATION_ERROR", "status must be DOWN | DEGRADED | RECOVERED", 400);
  }

  if (status === "RECOVERED") {
    // Resolve open device alerts for this gate.
    await query(
      `UPDATE public.alerts SET resolved = TRUE, resolved_at = now(), resolved_by = $3
        WHERE resource_type = 'gate_device' AND resource_id = $1 AND resolved = FALSE`,
      [body.gateId, null, auth.userId],
    );
  } else {
    const res = await query(
      `INSERT INTO public.alerts (severity, resource_type, resource_id, title, detail, created_by)
       VALUES ($1, 'gate_device', $2, $3, $4, $5)
       RETURNING id`,
      [status === "DOWN" ? "high" : "medium", body.gateId,
       `Gate device ${body.device ?? "unknown"} ${status.toLowerCase()}`,
       body.note?.trim() || null, auth.userId],
    );
  }

  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role, action: "gate_device_health",
    resource: "gate", resourceId: body.gateId,
    afterState: { device: body.device ?? null, status, note: body.note ?? null },
  });
  return ok({ gateId: body.gateId, status });
}

export const POST = withMutationGuard(implPost, {
  requiredRole: ["operator", "supervisor", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "gate-device-health", maxRequests: 10 },
});
