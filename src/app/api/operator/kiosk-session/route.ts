import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withRateLimit, rateLimitByKey, extractClientIp } from "@/lib/rate-limit";
import { signAccessToken, signRefreshToken } from "@/lib/auth-token";
import crypto from "crypto";
import { addAudit } from "@/lib/db";
import { assertCsrf } from "@/lib/csrf";
import {
  findKioskDefaultOperators,
  resolveKioskGateId,
  resolveKioskGateIdForOperator,
} from "@/lib/kiosk-operator";
import type { Role } from "@/lib/types";

function misconfiguredResponse(count: number) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "KIOSK_MISCONFIGURED",
        message:
          count === 0
            ? "No kiosk default operator configured"
            : "Multiple kiosk default operators configured — exactly one is required",
      },
    },
    { status: 500 }
  );
}

async function handleKioskSession(
  req: NextRequest,
  bodyGateId?: string | null
): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const ip = extractClientIp(req);
  const rl = await rateLimitByKey(`kiosk-session:${ip}`, {
    windowMs: 60_000,
    maxRequests: 6,
  });
  if (rl.limited) {
    return NextResponse.json(
      { success: false, error: { code: "RATE_LIMITED", message: "Too many kiosk mints" } },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }

  const operators = await findKioskDefaultOperators();
  if (operators.length !== 1) return misconfiguredResponse(operators.length);

  const op = operators[0];
  if (op.status !== "ACTIVE") {
    return NextResponse.json(
      { success: false, error: { code: "ACCOUNT_INACTIVE", message: "Kiosk operator is not active" } },
      { status: 403 }
    );
  }

  const gateResolution = await resolveKioskGateIdForOperator(op, bodyGateId ?? null);
  if (!gateResolution || "error" in gateResolution) {
    return NextResponse.json(
      { success: false, error: gateResolution?.error ?? { code: "GATE_RESOLUTION_FAILED", message: "Failed to resolve gate" } },
      { status: 400 }
    );
  }

  const jti = crypto.randomUUID();
  const access = await signAccessToken({
    sub: op.id,
    email: op.email ?? undefined,
    role: op.role as Role,
    account_status: op.status,
    name: op.name,
    session_version: op.session_version,
    kiosk: true,
    jti,
  });
  const refresh = await signRefreshToken({
    sub: op.id,
    email: op.email ?? undefined,
    role: op.role as Role,
    jti,
  });

  await addAudit({
    action: "OPERATOR_KIOSK_SESSION",
    userId: op.id,
    userName: op.name,
    role: op.role as Role,
    details: JSON.stringify({
      ip,
      gateId: gateResolution.gateId,
      requestedGateId: bodyGateId ?? null,
    }),
  });

  return NextResponse.json({
    success: true,
    data: {
      accessToken: access,
      refreshToken: refresh,
      gateId: gateResolution.gateId,
      operator: {
        id: op.id,
        name: op.name,
        uniqueId: op.unique_id,
        role: op.role,
      },
      expiresIn: 900,
    },
  });
}

export const POST = withRateLimit(
  (req: NextRequest) => handleKioskSession(req),
  { windowMs: 60_000, maxRequests: 10 }
);

export const GET = withRateLimit(
  (req: NextRequest) => {
    const url = new URL(req.url);
    return handleKioskSession(req, url.searchParams.get("gateId"));
  },
  { windowMs: 60_000, maxRequests: 10 }
);
