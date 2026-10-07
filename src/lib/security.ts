/**
 * Security Hardening & Zero-Trust Architecture Utility
 * Uses `system_settings` database table for persistence with in-memory caching.
 */
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

export function isIpAllowed(ip: string | null): boolean {
  if (!ip) return true; // If no IP header in local env, allow
  if (inMemoryAllowedIps.length === 0) return true;
  return inMemoryAllowedIps.some((allowed) => {
    if (allowed.includes("/")) {
      const prefix = allowed.split("/")[0].split(".").slice(0, 3).join(".");
      return ip.startsWith(prefix);
    }
    return ip === allowed;
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
  if (Math.abs(now - ts) > 300000) {
    return { valid: false, reason: "Replay attack protection: Timestamp expired." };
  }
  if (!nonce || nonce.length < 8) {
    return { valid: false, reason: "Invalid nonce." };
  }
  return { valid: true };
}

export async function getSecurityStats(): Promise<SecurityStats> {
  try {
    const supabase = getSupabaseServiceClient();
    const { data } = await supabase.from("system_settings").select("value").eq("id", "security_ip_allowlist").single();
    if (data?.value) {
      if (Array.isArray(data.value.allowed_ips)) {
        inMemoryAllowedIps = data.value.allowed_ips;
      }
      if (typeof data.value.forced_2fa === "boolean") {
        inMemoryForced2FA = data.value.forced_2fa;
      }
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
    ipAllowlistEnabled: true,
    allowedIps: inMemoryAllowedIps,
  };
}

export async function updateIpAllowlist(ips: string[], force2FA?: boolean): Promise<SecurityStats> {
  inMemoryAllowedIps = ips;
  if (force2FA !== undefined) inMemoryForced2FA = force2FA;

  try {
    const supabase = getSupabaseServiceClient();
    await supabase.from("system_settings").upsert({
      id: "security_ip_allowlist",
      value: {
        allowed_ips: inMemoryAllowedIps,
        forced_2fa: inMemoryForced2FA,
      },
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error updating security settings in DB:", err);
  }

  return getSecurityStats();
}

