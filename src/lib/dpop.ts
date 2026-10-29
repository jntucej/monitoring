import { jwtVerify, importJWK, calculateJwkThumbprint, JWK } from "jose";

export interface DPoPProofValidationResult {
  valid: boolean;
  jkt?: string;
  error?: string;
}

// In-memory replay cache with TTL (10 minutes)
const replayCache = new Map<string, number>();

function cleanReplayCache() {
  const now = Date.now();
  for (const [jti, exp] of replayCache.entries()) {
    if (exp <= now) replayCache.delete(jti);
  }
}

// Clean up replay cache periodically
setInterval(cleanReplayCache, 60_000).unref?.();

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

    // Never accept private keys inside the public jwk header
    if ("d" in jwk) {
      return { valid: false, error: "PRIVATE_KEY_IN_DPOP_HEADER" };
    }

    const alg = header.alg || (jwk.kty === "EC" ? "ES256" : "RS256");
    const key = await importJWK(jwk, alg);

    const { payload } = await jwtVerify(proofJwt, key, {
      algorithms: ["ES256", "RS256", "EdDSA"],
      maxTokenAge: "5m", // Proof must be recent (+- 5 minutes)
    });

    // Check htm (HTTP Method)
    if (!payload.htm || String(payload.htm).toUpperCase() !== htm.toUpperCase()) {
      return { valid: false, error: "DPOP_HTM_MISMATCH" };
    }

    // Check htu (HTTP URI path / URL)
    if (!payload.htu) {
      return { valid: false, error: "DPOP_HTU_MISSING" };
    }
    const reqPath = htu.split("?")[0].toLowerCase();
    const proofPath = String(payload.htu).split("?")[0].toLowerCase();
    if (!proofPath.endsWith(reqPath) && !reqPath.endsWith(proofPath)) {
      return { valid: false, error: "DPOP_HTU_MISMATCH" };
    }

    // Check jti (Replay detection)
    if (!payload.jti || typeof payload.jti !== "string") {
      return { valid: false, error: "DPOP_JTI_MISSING" };
    }

    const now = Date.now();
    cleanReplayCache();
    if (replayCache.has(payload.jti)) {
      return { valid: false, error: "DPOP_REPLAY_DETECTED" };
    }
    // Store jti for 10 minutes
    replayCache.set(payload.jti, now + 10 * 60 * 1000);

    // Calculate public key thumbprint
    const jkt = await calculateJwkThumbprint(jwk, "sha256");

    return {
      valid: true,
      jkt,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, error: `DPOP_VERIFICATION_FAILED: ${msg}` };
  }
}
