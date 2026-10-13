// src/server/http/trusted-headers.ts
// ─────────────────────────────────────────────────────────────────────────────
// Fixes audit issue #2: route handlers read `x-user-role` etc. and TRUST them.
// That is only safe if every route is wrapped in withAuthorization AND that
// middleware always overwrote those headers.
//
// This module adds a second guarantee: a short-lived HMAC signature attached
// to every request by withAuthorization. Any route that reads identity headers
// MUST ALSO call `requireTrustedHeaders(req)`. If the signature is missing,
// stale, or wrong, the request is rejected — even if a dev forgot to wrap the
// route in withAuthorization.
//
// Requires INTERNAL_MW_SECRET (32+ chars). Generate with: openssl rand -hex 32
// ─────────────────────────────────────────────────────────────────────────────

import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { fail } from "@/server/http/response";
import { requireSecret } from "@/lib/env";

const MAX_AGE_MS = 30_000;

interface TrustedIdentity {
  userId: string;
  role: string;
  email: string | null;
}

function getSecret(): Buffer {
  return Buffer.from(requireSecret("INTERNAL_MW_SECRET", 32), "utf8");
}

export function signTrustedHeaders(identity: TrustedIdentity, nowMs: number = Date.now()): string {
  const payload = `${identity.userId}:${identity.role}:${identity.email ?? ""}:${nowMs}`;
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function requireTrustedHeaders(req: NextRequest): Response | null {
  const userId = req.headers.get("x-user-id");
  const role   = req.headers.get("x-user-role");
  const email  = req.headers.get("x-user-email");
  const sig    = req.headers.get("x-mw-signature");
  const tsRaw  = req.headers.get("x-mw-timestamp");

  if (!userId || !role || !sig || !tsRaw) {
    return fail("UNTRUSTED_REQUEST", "missing trusted identity headers", 401);
  }
  const ts = Number(tsRaw);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_AGE_MS) {
    return fail("STALE_MW_SIGNATURE", "middleware signature expired", 401);
  }
  const expected = signTrustedHeaders({ userId, role, email }, ts);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return fail("BAD_MW_SIGNATURE", "invalid middleware signature", 401);
  }
  return null;
}
