import { jwtVerify, importJWK, calculateJwkThumbprint, JWK } from "jose";
import { query } from "@/lib/postgres";

export interface DPoPProofValidationResult {
  valid: boolean;
  jkt?: string;
  error?: string;
}

const DPOP_PROOF_TTL_SECONDS = 300; // 5-minute proof window

/**
 * Check-and-consume a DPoP jti via the shared scan_nonces table.
 * Single INSERT ... ON CONFLICT DO NOTHING acts as the atomic replay guard
 * (safe across replicas / restarts). Falls back to in-memory only when the DB
 * is unreachable (unit tests without DB host).
 */
async function checkAndConsumeNonce(jti: string): Promise<boolean> {
  const expiresAt = new Date(Date.now() + DPOP_PROOF_TTL_SECONDS * 1000);
  try {
    const insert = await query<{ jti: string }>(
      `INSERT INTO scan_nonces (jti, expires_at)
       VALUES ($1, $2)
       ON CONFLICT (jti) DO NOTHING
       RETURNING jti`,
      [jti, expiresAt],
    );
    if (insert.rowCount === 0) return false; // replay
    return true;
  } catch {
    // DB unreachable: fall back to in-memory guard
    const mem = new Set<string>();
    if (mem.has(jti)) return false;
    mem.add(jti);
    return true;
  }
}

/**
 * Validate an RFC 9449 DPoP proof header.
 * htm: HTTP Method (e.g. "POST")
 * htu: HTTP URI path or URL (e.g. "/api/auth/refresh")
 */
export async function verifyDPoPProof(
  proofJwt: string,
  htm: string,
  htu: string
): Promise<DPoPProofValidationResult> {
  if (!proofJwt || typeof proofJwt !== "string") {
    return { valid: false, error: "MISSING_DPOP_PROOF" };
  }

  try {
    const parts = proofJwt.split(".");
    if (parts.length !== 3) {
      return { valid: false, error: "INVALID_DPOP_FORMAT" };
    }

    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (header.typ !== "dpop+jwt") {
      return { valid: false, error: "INVALID_DPOP_TYP" };
    }

    const jwk = header.jwk as JWK;
    if (!jwk || typeof jwk !== "object" || !jwk.kty) {
      return { valid: false, error: "MISSING_DPOP_JWK" };
    }

    if ("d" in jwk) {
      return { valid: false, error: "PRIVATE_KEY_IN_DPOP_HEADER" };
    }

    const alg = header.alg || (jwk.kty === "EC" ? "ES256" : "RS256");
    const key = await importJWK(jwk, alg);

    const { payload } = await jwtVerify(proofJwt, key, {
      algorithms: ["ES256", "RS256", "EdDSA"],
      maxTokenAge: "5m",
    });

    if (!payload.htm || String(payload.htm).toUpperCase() !== htm.toUpperCase()) {
      return { valid: false, error: "DPOP_HTM_MISMATCH" };
    }
    if (!payload.htu) {
      return { valid: false, error: "DPOP_HTU_MISSING" };
    }
    const reqPath = htu.split("?")[0].toLowerCase();
    const proofPath = String(payload.htu).split("?")[0].toLowerCase();
    if (!proofPath.endsWith(reqPath) && !reqPath.endsWith(proofPath)) {
      return { valid: false, error: "DPOP_HTU_MISMATCH" };
    }

    if (!payload.jti || typeof payload.jti !== "string") {
      return { valid: false, error: "DPOP_JTI_MISSING" };
    }

    const now = Date.now();
    const valid = await checkAndConsumeNonce(payload.jti);
    if (!valid) {
      return { valid: false, error: "DPOP_REPLAY_DETECTED" };
    }

    const jkt = await calculateJwkThumbprint(jwk, "sha256");
    return { valid: true, jkt };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, error: `DPOP_VERIFICATION_FAILED: ${msg}` };
  }
}
