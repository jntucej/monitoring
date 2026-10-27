import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { addAudit } from "@/lib/db";
import { invalidateAuthCache } from "@/lib/authContext";
import { RATE_LIMITS } from "@/config/app-constants";
import type { RateLimitConfig } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";
import { hashClaimCode, normalizeClaimCode } from "@/lib/claim-codes";

/**
 * Operator gate claim.
 *
 * POST /api/operator/claim-gate { code }
 *   An operator with NO assigned gate enters the claim string a supervisor
 *   generated (via /api/supervisor/claim-codes). The code is hashed, matched
 *   against an active / unexpired / unused / unrevoked row, and on a match the
 *   operator's users.gate_id is bound to that gate. One-use: the code row is
 *   marked used_at/used_by and cannot be replayed.
 *
 * On success the operator's auth row cache is evicted so the very next request
 * (and the in-memory auth store) sees the freshly-assigned gate_id.
 */

const limit: RateLimitConfig = { ...RATE_LIMITS.admin, keyPrefix: "operator_claim_gate" };

async function handlePost(req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const codeRaw = typeof body.code === "string" ? body.code : "";
  if (!normalizeClaimCode(codeRaw)) {
    return NextResponse.json(
      { success: false, error: { code: "CODE_REQUIRED", message: "Enter the gate-claim code your supervisor gave you." } },
      { status: 400 }
    );
  }

  const auth = ctx.auth;

  // Already assigned a gate? Claim is only for unassigned operators.
  if (auth.gateId) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ALREADY_ASSIGNED",
          message: `You already have a gate assigned (${auth.gateId}). Ask a supervisor to move you instead of claiming.`,
        },
      },
      { status: 409 }
    );
  }

  const codeHash = hashClaimCode(codeRaw);

  // Find the matching active claim row (scoped to active, unexpired, unused).
  const res = await query<{
    id: string;
    gate_id: string;
    gate_name: string;
    expires_at: string;
  }>(
    `SELECT c.id, c.gate_id, g.name AS gate_name, c.expires_at
       FROM public.gate_claim_codes c
       JOIN public.gates g ON g.id = c.gate_id
      WHERE c.code_hash = $1
        AND c.revoked = FALSE
        AND c.used_at IS NULL
        AND c.expires_at > NOW()
        AND g.is_active = TRUE
      LIMIT 1`,
    [codeHash]
  );

  const row = res.rows[0];
  if (!row) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CLAIM_CODE_INVALID",
          message: "That claim code is not valid (expired, already used, revoked, or not found). Ask your supervisor for a fresh code.",
        },
      },
      { status: 404 }
    );
  }

  // Bind the gate to this operator and mark the code used, in one statement
  // so a partial state can't be observed.
  await query(
    `UPDATE public.users SET gate_id = $1 WHERE id = $2`,
    [row.gate_id, auth.userId]
  );
  await query(
    `UPDATE public.gate_claim_codes
        SET used_at = NOW(), used_by = $2
      WHERE id = $1`,
    [row.id, auth.userId]
  );

  // Evict the cached user row so the next authenticated request carries the
  // fresh gate_id (and so any in-flight UI re-check sees the assignment).
  invalidateAuthCache(auth.userId);

  await addAudit({
    action: "GATE_CLAIMED",
    userId: auth.userId,
    userName: auth.email,
    role: auth.role as Role,
    details: JSON.stringify({ claimCodeId: row.id, gateId: row.gate_id, gateName: row.gate_name }),
  });

  return NextResponse.json({
    success: true,
    data: {
      gateId: row.gate_id,
      gateName: row.gate_name,
      note: "Gate assigned. You can now start at that gate.",
    },
  });
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["operator", "supervisor", "sysadmin"] }),
  limit
);
