// src/app/api/admin/steward/delegates/activate/route.ts
// POST /api/admin/steward/delegates/activate
//
// Activates a nominated Leave Delegate (sets approved_by + requires_approval=FALSE)
// or updates routing_policies.sla_timeout_hours.
// Emits DELEGATE_ACTIVATED to domain_outbox + audit row.
//
// auth: ['admin'] only.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

export const POST = withAuthorization(async (req: NextRequest, { auth }: { auth: AuthContext }) => {
  if (!["admin"].includes(auth.role)) {
    return fail("FORBIDDEN", "ADMIN only", 403);
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: "activate_delegate" | "update_timeout_hours";
    delegationId?: string;
    expiresAt?: string;
    policyKey?: string;
    slaTimeoutHours?: number;
  };

  if (body.action === "activate_delegate") {
    if (!body.delegationId) return fail("VALIDATION", "delegationId required");

    const result = await query(
      `UPDATE delegations
          SET requires_approval = FALSE,
              approved_by = $1,
              expires_at = COALESCE($2::timestamptz, expires_at)
        WHERE id = $3 AND requires_approval = TRUE AND revoked_at IS NULL
        RETURNING id, expires_at`,
      [auth.userId, body.expiresAt ?? null, body.delegationId],
    );

    if (result.rows.length === 0) {
      return fail("NOT_FOUND", "Pending delegation not found or already activated", 404);
    }

    // Emit DELEGATE_ACTIVATED to domain_outbox
    await query(
      `INSERT INTO domain_outbox (event_type, payload, status)
       VALUES ($1, $2, 'PENDING')`,
      [
        "DELEGATE_ACTIVATED",
        JSON.stringify({
          delegationId: body.delegationId,
          activatedBy: auth.userId,
          activatedAt: new Date().toISOString(),
          expiresAt: result.rows[0].expires_at,
        }),
      ],
    );

    await addAudit({
      action: "delegate_activated",
      userId: auth.userId,
      role: "admin",
      details: { delegationId: body.delegationId, expiresAt: result.rows[0].expires_at },
    });

    return ok({
      activated: true,
      delegationId: body.delegationId,
      expiresAt: result.rows[0].expires_at,
    });
  }

  if (body.action === "update_timeout_hours") {
    if (!body.policyKey || body.slaTimeoutHours == null) {
      return fail("VALIDATION", "policyKey + slaTimeoutHours required");
    }

    // Validate: timeout_hours must be positive integer ≤ 720 (30 days)
    const h = Math.round(body.slaTimeoutHours);
    if (h < 1 || h > 720) {
      return fail("VALIDATION", "slaTimeoutHours must be 1..720", 400, { value: h });
    }

    const result = await query(
      `UPDATE routing_policies
          SET sla_timeout_hours = $1
        WHERE policy_key = $2 AND status = 'ACTIVE'
        RETURNING id, sla_timeout_hours`,
      [h, body.policyKey],
    );

    if (result.rows.length === 0) {
      return fail("NOT_FOUND", "Active routing_policy not found", 404);
    }

    await addAudit({
      action: "timeout_hours_updated",
      userId: auth.userId,
      role: "admin",
      details: { policyKey: body.policyKey, slaTimeoutHours: h },
    });

    return ok({
      updated: true,
      policyKey: body.policyKey,
      slaTimeoutHours: h,
    });
  }

  return fail("VALIDATION", "action must be 'activate_delegate' or 'update_timeout_hours'");
}, { requiredRole: ["admin"] });
