/**
 * Security Hardening & Zero-Trust Architecture Utility
 * Uses `system_settings` database table for persistence with in-memory caching.
 */
import crypto from "crypto";
import { getSupabaseServiceClient } from "./dbClient";

export interface SecurityStats {
  failedLogins24h: number;
  activeSessions: number;
  forced2FA: boolean;
  ipAllowlistEnabled: boolean;
  allowedIps: string[];
}

let inMemoryAllowedIps: string[] = ["127.0.0.1", "::1", "192.168.1.0/24"];
let inMemoryForced2FA = false;
let inMemoryIpAllowlistEnabled = true;

export function isIpAllowed(ip: string | null): boolean {
  if (!ip) return !inMemoryIpAllowlistEnabled; 
  if (inMemoryAllowedIps.length === 0) return true;

  // Normalize IPv6 mapped IPv4 like ::ffff:127.0.0.1
  const cleanIp = ip.startsWith("::ffff:") ? ip.slice(7) : ip;

  return inMemoryAllowedIps.some((allowed) => {
    if (allowed === cleanIp || allowed === ip) return true;
    if (allowed === "::1" && (cleanIp === "127.0.0.1" || ip === "::1")) return true;
    if (allowed === "127.0.0.1" && (cleanIp === "127.0.0.1" || ip === "::1")) return true;

    if (allowed.includes("/")) {
      const [subnet, bitsStr] = allowed.split("/");
      const bits = parseInt(bitsStr, 10);
      if (bits === 24) {
        const subnetPrefix = subnet.split(".").slice(0, 3).join(".");
        return cleanIp.startsWith(subnetPrefix + ".");
      }
      if (bits === 16) {
        const subnetPrefix = subnet.split(".").slice(0, 2).join(".");
        return cleanIp.startsWith(subnetPrefix + ".");
      }
      if (bits === 8) {
        const subnetPrefix = subnet.split(".").slice(0, 1).join(".");
        return cleanIp.startsWith(subnetPrefix + ".");
      }
    }
    return false;
  });
}

export function verifyScanSignature(
  payload: string,
  signature: string,
  timestamp: string,
  nonce: string
): { valid: boolean; reason?: string } {
  const ts = new Date(timestamp).getTime();
  const now = Date.now();
  // Reject replay if timestamp is older than 5 minutes
  if (isNaN(ts) || Math.abs(now - ts) > 300000) {
    return { valid: false, reason: "Replay attack protection: Timestamp expired." };
  }
  if (!nonce || nonce.length < 8) {
    return { valid: false, reason: "Invalid nonce." };
  }

  // If signature is provided, verify against HMAC-SHA256
  if (signature) {
    const secret = process.env.SCAN_SIGNING_SECRET || process.env.MOBILE_TOKEN_SECRET || "cej-scan-signature-secret";
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`${payload}:${timestamp}:${nonce}`)
      .digest("hex");

    const fallbackExpected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    const fbBuf = Buffer.from(fallbackExpected);

    const matchesExpected = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
    const matchesFallback = sigBuf.length === fbBuf.length && crypto.timingSafeEqual(sigBuf, fbBuf);

    if (!matchesExpected && !matchesFallback && process.env.NODE_ENV === "production") {
      return { valid: false, reason: "Cryptographic signature verification failed." };
    }
  }

  return { valid: true };
}

export async function getSecurityStats(): Promise<SecurityStats> {
  try {
    const supabase = getSupabaseServiceClient();
    const { data } = await supabase.from("system_settings").select("value").eq("id", "security_ip_allowlist").single();
    if (data?.value && typeof data.value === "object" && !Array.isArray(data.value)) {
      if (Array.isArray(data.value.allowed_ips)) {
        inMemoryAllowedIps = data.value.allowed_ips;
      }
      if (typeof data.value.forced_2fa === "boolean") {
        inMemoryForced2FA = data.value.forced_2fa;
      }
      if (typeof data.value.ip_allowlist_enabled === "boolean") {
        inMemoryIpAllowlistEnabled = data.value.ip_allowlist_enabled;
      }
    } else if (data?.value !== undefined && data?.value !== null) {
      console.error("[security] system_settings 'security_ip_allowlist' has unexpected shape:", typeof data.value);
    }
  } catch (err) {
    console.error("Error loading security settings from DB:", err);
  }

  let failed24h = 0;
  let activeSessions = 0;
  try {
    const { query } = await import("./postgres");
    const resFail = await query("SELECT COUNT(*)::int as count FROM audit_logs WHERE action = 'LOGIN_FAILED' AND timestamp >= NOW() - INTERVAL '24 hours'");
    failed24h = resFail.rows[0]?.count ?? 0;
    const resSess = await query("SELECT COUNT(*)::int as count FROM sessions WHERE revoked_at IS NULL AND expires_at > NOW()");
    activeSessions = resSess.rows[0]?.count ?? 0;
  } catch {}

  return {
    failedLogins24h: failed24h,
    activeSessions: activeSessions,
    forced2FA: inMemoryForced2FA,
    ipAllowlistEnabled: inMemoryIpAllowlistEnabled,
    allowedIps: inMemoryAllowedIps,
  };
}

export async function updateIpAllowlist(ips: string[], enabled = true, force2FA?: boolean): Promise<SecurityStats> {
  inMemoryAllowedIps = ips;
  inMemoryIpAllowlistEnabled = enabled;
  if (force2FA !== undefined) inMemoryForced2FA = force2FA;

  try {
    const supabase = getSupabaseServiceClient();
    await supabase.from("system_settings").upsert({
      id: "security_ip_allowlist",
      value: {
        allowed_ips: inMemoryAllowedIps,
        forced_2fa: inMemoryForced2FA,
        ip_allowlist_enabled: inMemoryIpAllowlistEnabled,
      },
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error updating security settings in DB:", err);
  }

  return getSecurityStats();
}


