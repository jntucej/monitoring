import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, rateLimitByKey, extractClientIp } from "@/lib/rate-limit";
import { signAccessToken, signRefreshToken } from "@/lib/auth-token";
import crypto from "crypto";
import { addAudit } from "@/lib/db";
import { assertCsrf } from "@/lib/csrf";
import {
  findKioskDefaultOperators,
  resolveKioskGateId,
  resolveKioskGateIdForOperator,
  verifyKioskPin,
} from "@/lib/kiosk-operator";
import type { Role } from "@/lib/types";

/**
 * Kiosk session auth gate.
 *
 * This route mints an operator-scoped JWT for the designated kiosk default
 * operator. Because it grants OPERATOR without a login (no password, no
 * device attestation), access must be restricted to one of three modes:
 *
 *   1. TRUSTED_IP   — TRUSTED_KIOSK_IPS set (non-empty). The request client IP
 *                     must be in the comma-separated list, else 403
 *                     KIOSK_IP_NOT_TRUSTED. Fast-fails before rate limiting.
 *   2. PIN_REQUIRED — TRUSTED_KIOSK_IPS unset AND KIOSK_SESSION_REQUIRE_PIN
 *                     === 'true'. 426 UPGRADE_REQUIRED: the kiosk client must
 *                     collect a PIN from the operator before retrying.
 *   3. OPEN         — both env vars unset. Backwards-compatible open mode;
 *                     logs a one-time console.warn and allows the session.
 *
 * Modes 1 and 2 run BEFORE the rate-limit and audit paths so that
 * unauthorized callers cannot burn rate-limit quota.
 */
const KIOSK_AUTH_WARNED = { current: false };

export type KioskGateDecision =
  | { kind: "pass" }
  | { kind: "pin_missing" }
  | { kind: "pin_invalid"; pin: string }
  | { kind: "ip_not_trusted" }
  | { kind: "open" };

/**
 * Determine which gate applies. Does NOT verify the PIN — that happens in
 * `handleKioskSession` after the operator row is resolved, so we can
 * compare against `operator.password_hash`.
 */
async function kioskGateDecision(
  req: NextRequest,
  bodyPin?: string | null
): Promise<KioskGateDecision> {
  const trusted = (process.env.TRUSTED_KIOSK_IPS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Mode 1: TRUSTED_KIOSK_IPS allowlist
  if (trusted.length > 0) {
    const ip = extractClientIp(req);
    if (!trusted.includes(ip)) {
      return { kind: "ip_not_trusted" };
    }
    return { kind: "pass" };
  }

  // Mode 2: KIOSK_SESSION_REQUIRE_PIN=true → PIN must be supplied.
  // The actual bcrypt verification happens after operator resolution, because
  // we need the operator's password_hash to compare against.
  const requirePin = process.env.KIOSK_SESSION_REQUIRE_PIN === "true";
  if (requirePin) {
    if (bodyPin === undefined || bodyPin === null || bodyPin === "") {
      return { kind: "pin_missing" };
    }
    return { kind: "pin_invalid", pin: bodyPin };
  }

  // Mode 3: open (backwards compat). One-time warning.
  if (!KIOSK_AUTH_WARNED.current) {
    KIOSK_AUTH_WARNED.current = true;
    console.warn(
      "[kiosk-session] No trusted IP or PIN requirement configured; kiosk session is open to any caller"
    );
  }
  return { kind: "open" };
}

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

/**
 * Mint an operator-scoped kiosk session for the designated kiosk default
 * operator. Auth modes (see kioskAuthGate above):
 *   TRUSTED_IP  — 403 unless client IP in TRUSTED_KIOSK_IPS
 *   PIN_REQUIRED — 426 unless operator PIN supplied
 *   OPEN        — backwards compat, warns once in logs
 *
 * Both GET and POST run the same handler. GET reads ?gateId and ?pin from
 * the query string; POST reads { gateId, pin } from the JSON body.
 */
async function handleKioskSession(
  req: NextRequest,
  bodyGateId?: string | null,
  bodyPin?: string | null
): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  // Fail fast: IP allowlist / PIN gate BEFORE the rate-limit path so an
  // unauthorized caller cannot consume rate-limit quota.
  const decision = await kioskGateDecision(req, bodyPin ?? null);

  switch (decision.kind) {
    case "ip_not_trusted":
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "KIOSK_IP_NOT_TRUSTED",
            message: "Client IP is not in TRUSTED_KIOSK_IPS",
          },
        },
        { status: 403 }
      );
    case "pin_missing":
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PIN_REQUIRED",
            message:
              "A kiosk operator PIN is required to mint a kiosk session. Show the operator PIN entry UI and retry with ?pin=<operator-pin>.",
          },
          upgradesRequired: true,
        },
        { status: 426 }
      );
    case "open":
      break; // open mode — proceed to session mint.
    case "pass":
      break; // trusted IP — proceed to session mint.
    case "pin_invalid":
      break; // verified after operator resolution below.
  }

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

  // In PIN_REQUIRED mode, verify the supplied PIN against the operator's
  // stored password (bcrypt). The kiosk PIN is the operator's password in
  // the password-only auth model. A wrong or missing hash → reject.
  if (decision.kind === "pin_invalid") {
    const pinOk = await verifyKioskPin(op, decision.pin);
    if (!pinOk) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PIN_INVALID",
            message: "Kiosk operator PIN is incorrect. Please retry.",
          },
        },
        { status: 401 }
      );
    }
  }

  const gateResolution = await resolveKioskGateIdForOperator(op, bodyGateId ?? null);

  // When the kiosk operator has NO assigned gate (and no valid hint), we
  // still mint the session — but with `noGate: true` so the client knows to
  // show the "Register / enter a claim code" panel instead of trying to
  // start scanning at a gate that doesn't exist yet.
  const noGate = !gateResolution || "error" in gateResolution;

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
      gateId: noGate ? null : gateResolution!.gateId,
      requestedGateId: bodyGateId ?? null,
      noGate,
    }),
  });

  return NextResponse.json({
    success: true,
    data: {
      accessToken: access,
      refreshToken: refresh,
      gateId: noGate ? null : gateResolution!.gateId,
      noGate,
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
  async (req: NextRequest) => {
    let gateId: string | null = null;
    let pin: string | null = null;
    try {
      const body = (await req.json()) as Record<string, unknown>;
      gateId = typeof body.gateId === "string" ? body.gateId : null;
      pin = typeof body.pin === "string" ? body.pin : null;
    } catch {
      // No JSON body — fine, gateId/pin stay null.
    }
    return handleKioskSession(req, gateId, pin);
  },
  { windowMs: 60_000, maxRequests: 10 }
);

export const GET = withRateLimit(
  (req: NextRequest) => {
    const url = new URL(req.url);
    const gateId = url.searchParams.get("gateId");
    const pin = url.searchParams.get("pin");
    return handleKioskSession(req, gateId, pin);
  },
  { windowMs: 60_000, maxRequests: 10 }
);
