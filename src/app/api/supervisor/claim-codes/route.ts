import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { addAudit } from "@/lib/db";
import { RATE_LIMITS } from "@/config/app-constants";
import type { RateLimitConfig } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";
import { mintClaimCode, hashClaimCode, formatClaimCode } from "@/lib/claim-codes";

/**
 * Supervisor gate-claim codes.
 *
 *   POST  /api/supervisor/claim-codes  { gateId, label? }
 *     → mint a one-time, human-readable claim string for that gate. Only the
 *       SHA-256 hash is stored; the plaintext is returned exactly once so the
 *       supervisor can show / copy / read it aloud to an operator.
 *   GET   /api/supervisor/claim-codes  ?gateId=
 *     → list this supervisor's active (unexpired, unused, unrevoked) claim
 *       codes. The plaintext is NOT returned (only ever the hash) — the
 *       listing shows gate, expiry, who generated it, and revocation state.
 *   DELETE /api/supervisor/claim-codes { code }  (or ?code=)
 *     → revoke a code.
 *
 * Generation is scoped: a supervisor may only mint codes for gates in their
 * supervised_gates array (or, for sysadmin, any gate). A claim code is one-
 * use, revocable, and expires (default 24 h).
 */

const limit: RateLimitConfig = { ...RATE_LIMITS.admin, keyPrefix: "supervisor_claim_codes" };

interface ClaimCodeRow {
  id: string;
  gate_id: string;
  gate_name: string | null;
  operator_name_label: string | null;
  generated_by: string | null;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  revoked: boolean;
  created_at: string;
}

async function handlePost(req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const gateId = typeof body.gateId === "string" ? body.gateId.trim() : "";
  const label = typeof body.label === "string" ? body.label.slice(0, 120) : null;

  const auth = ctx.auth;

  // Gate must be a well-formed UUID (the gates.id column is uuid).
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(gateId)) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_GATE_ID", message: "gateId must be a gate UUID." } },
      { status: 400 }
    );
  }

  // Gate must exist and be active.
  const gateRes = await query<{ id: string; name: string; is_active: boolean }>(
    `SELECT id, name, is_active FROM public.gates WHERE id = $1`,
    [gateId]
  );
  const gate = gateRes.rows[0];
  if (!gate) {
    return NextResponse.json(
      { success: false, error: { code: "GATE_NOT_FOUND", message: "Gate not found." } },
      { status: 404 }
    );
  }
  if (!gate.is_active) {
    return NextResponse.json(
      { success: false, error: { code: "GATE_INACTIVE", message: "Gate is not active." } },
      { status: 400 }
    );
  }

  // Scope: supervisor may only mint codes for their supervised gates.
  const supervised = auth.supervisedGates ?? [];
  const isSysadmin = auth.role === "sysadmin" || (auth.roles?.includes("sysadmin") ?? false);
  if (!isSysadmin && !supervised.includes(gateId)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "GATE_NOT_SUPERVISED",
          message: "You may only generate claim codes for gates you supervise.",
        },
      },
      { status: 403 }
    );
  }

  const { plaintext, codeHash, expiresAt } = mintClaimCode();

  await query(
    `INSERT INTO public.gate_claim_codes
       (code_hash, gate_id, operator_name_label, generated_by, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [codeHash, gateId, label, auth.userId, expiresAt.toISOString()]
  );

  await addAudit({
    action: "GATE_CLAIM_CODE_GENERATED",
    userId: auth.userId,
    userName: auth.email,
    role: auth.role as Role,
    details: JSON.stringify({ gateId, label: label ?? null, expiresAt: expiresAt.toISOString() }),
  });

  return NextResponse.json({
    success: true,
    data: {
      gateId,
      gateName: gate.name,
      // Returned ONCE. It is not recoverable afterwards (only the hash is
      // stored). The supervisor shows/copies it to the operator now.
      code: plaintext,
      codeFormatted: formatClaimCode(plaintext),
      expiresAt: expiresAt.toISOString(),
      note: "Give this code to the operator. It is shown only once and is one-time use.",
    },
  });
}

async function handleGet(req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> {
  const url = new URL(req.url);
  const gateId = url.searchParams.get("gateId");
  const auth = ctx.auth;
  const supervised = auth.supervisedGates ?? [];
  const isSysadmin = auth.role === "sysadmin" || (auth.roles?.includes("sysadmin") ?? false);

  // If a gate filter is provided, it must be a well-formed gate UUID.
  if (gateId) {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(gateId)) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_GATE_ID", message: "gateId must be a gate UUID." } },
        { status: 400 }
      );
    }
  }

  const params: unknown[] = [];
  let sql = `SELECT c.id, c.gate_id, g.name AS gate_name, c.operator_name_label,
                    c.generated_by, c.expires_at, c.used_at, c.used_by, c.revoked, c.created_at
             FROM public.gate_claim_codes c
             JOIN public.gates g ON g.id = c.gate_id`;
  const where: string[] = ["g.is_active = TRUE"];
  if (!isSysadmin) {
    params.push(supervised);
    where.push(`c.gate_id = ANY($${params.length}::uuid[])`);
  }
  if (gateId) {
    params.push(gateId);
    where.push(`c.gate_id = $${params.length}`);
  }
  sql += ` WHERE ${where.join(" AND ")}`;
  sql += ` ORDER BY c.created_at DESC LIMIT 200`;

  const rowsRes = await query<ClaimCodeRow>(sql, params);

  return NextResponse.json({
    success: true,
    data: {
      codes: rowsRes.rows,
      note: "Plaintext codes are not stored; only hashes. Use POST to mint a new code.",
    },
  });
}

async function handleDelete(req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const codeRaw = typeof body.code === "string" ? body.code.trim() : "";
  if (!codeRaw) {
    return NextResponse.json(
      { success: false, error: { code: "CODE_REQUIRED", message: "code is required." } },
      { status: 400 }
    );
  }
  const auth = ctx.auth;
  const supervised = auth.supervisedGates ?? [];
  const isSysadmin = auth.role === "sysadmin" || (auth.roles?.includes("sysadmin") ?? false);

  const res = await query<{ id: string; gate_id: string }>(
    `UPDATE public.gate_claim_codes SET revoked = TRUE
      WHERE code_hash = $1 AND revoked = FALSE AND used_at IS NULL
      ${isSysadmin ? "" : `AND gate_id = ANY($2::uuid[])`}
      RETURNING id, gate_id`,
    [hashClaimCode(codeRaw), ...(isSysadmin ? [] : [supervised])]
  );

  if (res.rows.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: "CODE_NOT_FOUND", message: "No active code matched (already used, revoked, expired, or not yours)." } },
      { status: 404 }
    );
  }

  await addAudit({
    action: "GATE_CLAIM_CODE_REVOKED",
    userId: auth.userId,
    userName: auth.email,
    role: auth.role as Role,
    details: JSON.stringify({ revoked: res.rows.length, codeHash: hashClaimCode(codeRaw) }),
  });

  return NextResponse.json({ success: true, data: { revoked: res.rows.length } });
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["supervisor", "sysadmin"] }),
  limit
);
export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["supervisor", "sysadmin"] }),
  limit
);
export const DELETE = withRateLimit(
  withAuthorization(handleDelete, { requiredRole: ["supervisor", "sysadmin"] }),
  limit
);
