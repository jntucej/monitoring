// src/app/api/operator/manual-entry/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Dedicated manual-entry surface (spec §11): records a scan with is_manual=TRUE
// after an operator manually verified a person at the gate. Manual entries are
// NOT exempt from the gate-pass check — recordScan enforces the same
// student-exit flow, so a missing pass surfaces as 403 NO_GATE_PASS and the
// operator must reject the scan or escalate to a warden/admin.
//
// Keying: withRateLimit is per-client-IP (extractClientIp) with a per-key
// prefix, so limits apply per (keyPrefix, ip) pair.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { TIER } from "@/server/policy/roles";
import { assertCsrf } from "@/lib/csrf";
import { requireTrustedHeaders } from "@/server/http/trusted-headers";
import { ok, fail } from "@/server/http/response";
import { AppError } from "@/server/http/errors";
import { recordScan } from "@/server/services/scan/record";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

interface ManualEntryBody {
  roll?: string;
  personId?: string;
  direction?: "IN" | "OUT";
  reason?: string;
  gateId?: string;
  isCorrection?: boolean;
  entryType?: "hosteller" | "day_scholar";
}

interface ManualEntryRow {
  id: string;
  user_id: string;
  direction: string;
  reason: string | null;
  gate_id: string | null;
  gate_name: string | null;
  operator_id: string | null;
  operator_name: string | null;
  timestamp: string;
  is_correction: boolean | null;
}

function resolveGateForRead(auth: AuthContext, hint?: string): string | null {
  const isOperatorRole = auth.role === "operator";
  if (hint) {
    // Operators are hard-bound to their gate; supervisors to supervisedGates.
    if (isOperatorRole) return auth.gateId ?? null;
    if (auth.supervisedGates?.includes(hint)) return hint;
    return null;
  }
  if (isOperatorRole) return auth.gateId ?? null;
  return auth.supervisedGates?.[0] ?? null;
}

async function handleGet(
  req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  const untrusted = requireTrustedHeaders(req);
  if (untrusted) return untrusted;

  const gateId = resolveGateForRead(auth, req.nextUrl.searchParams.get("gateId") ?? undefined);
  if (!gateId) {
    return fail("NO_GATE", "No gate available for this operator", 403);
  }

  try {
    const { rows } = await query<ManualEntryRow>(
      `SELECT id, user_id, direction, reason, gate_id, gate_name,
              operator_id, operator_name, timestamp, is_correction
         FROM movement_logs
        WHERE is_manual = TRUE AND gate_id = $1
        ORDER BY timestamp DESC
        LIMIT 50`,
      [gateId]
    );
    return ok({ entries: rows, gateId });
  } catch (error) {
    console.error("manual-entry list error:", error);
    return fail("INTERNAL_ERROR", "Failed to list manual entries", 500);
  }
}

async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  const untrusted = requireTrustedHeaders(req);
  if (untrusted) return untrusted;

  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const body = (await req.json().catch(() => null)) as ManualEntryBody | null;

  const identifier = (body?.roll ?? body?.personId ?? "").trim();
  if (!identifier) {
    return fail("BAD_REQUEST", "roll or personId is required", 400);
  }

  const direction = body?.direction;
  if (direction !== "IN" && direction !== "OUT") {
    return fail("BAD_REQUEST", 'direction must be "IN" or "OUT"', 400);
  }

  // Spec §11: reason is REQUIRED for manual entry (free text or reason code).
  const reason = (body?.reason ?? "").trim();
  if (!reason) {
    return fail("BAD_REQUEST", "reason is required for manual entry", 400);
  }

  // Gate hint: operators are hard-bound to their gate (recordScan enforces
  // via assertOperatorGateMatch); supervisors are checked against
  // supervisedGates. When absent, resolve from the caller's bound gate.
  const gateId =
    (body?.gateId ?? auth.gateId ?? null) ||
    (auth.role !== "operator" ? (auth.supervisedGates?.[0] ?? null) : null);
  if (!gateId) {
    return fail("BAD_REQUEST", "gateId could not be resolved for this operator", 400);
  }

  try {
    const result = await recordScan({
      roll: identifier,
      direction,
      reason,
      gateId,
      entryType: body?.entryType,
      isManual: true,
      operatorId: auth.userId,
      operatorName: auth.email,
      operatorRole: auth.role,
      operatorGateId: auth.gateId ?? null,
      supervisedGates: auth.supervisedGates,
    });
    return ok({
      log: result.log,
      isDuplicate: result.isDuplicate,
      person: result.person,
      isCorrection: body?.isCorrection ?? false,
    });
  } catch (err) {
    if (err instanceof AppError) {
      return fail(err.code, err.message, err.status, err.details);
    }
    console.error("manual-entry record error:", err);
    return fail("INTERNAL_ERROR", "Failed to record manual entry", 500);
  }
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: TIER.OPERATOR }),
  { keyPrefix: "manual_entry", maxRequests: 20, windowMs: 60_000 }
);

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: TIER.OPERATOR }),
  { keyPrefix: "manual_entry_list", maxRequests: 60, windowMs: 60_000 }
);

export const dynamic = "force-dynamic";
