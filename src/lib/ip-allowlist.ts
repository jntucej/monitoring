// src/lib/ip-allowlist.ts
// ─────────────────────────────────────────────────────────────────────────────
// M6 — Per-user IP allowlist. A user's `allowed_cidrs` column (TEXT[])
// restricts which source IPs may authenticate as that user. Enforced
// only when IP_ALLOWLIST_ENFORCED=true AND the user has a non-empty
// allowlist. NULL / empty array = no restriction (safe day-one default).
// ─────────────────────────────────────────────────────────────────────────────

import net from "net";

/** True when `ip` falls inside the CIDR block `cidr` (v4 or v6). */
export function ipInCidr(ip: string, cidr: string): boolean {
  if (!net.isIP(ip)) return false;
  const [range, bitsStr] = cidr.split("/");
  if (!net.isIP(range)) return false;
  const size = parseInt(bitsStr ?? (range.includes(":") ? "128" : "32"), 10);
  if (Number.isNaN(size)) return false;
  const isV6 = ip.includes(":");
  if (net.isIPv4(ip) !== net.isIPv4(range)) return false;

  const ipNum = ipNumFor(ip);
  const rangeNum = ipNumFor(range);
  if (ipNum === null || rangeNum === null) return false;

  const totalBits = isV6 ? 128 : 32;
  const mask =
    size === 0
      ? 0n
      : ((1n << BigInt(size)) - 1n) << BigInt(totalBits - size);
  return (ipNum & mask) === (rangeNum & mask);
}

function ipNumFor(ip: string): bigint | null {
  try {
    if (ip.includes(":")) {
      const parts = expandIPv6(ip);
      let num = 0n;
      for (const p of parts) {
        num = (num << 16n) | BigInt(p);
      }
      return num;
    }
    const octets = ip.split(".").map(Number);
    if (octets.length !== 4) return null;
    let num = 0n;
    for (const o of octets) {
      num = (num << 8n) | BigInt(o);
    }
    return num;
  } catch {
    return null;
  }
}

/** Expand "a:b::c" to 8 hex groups. */
function expandIPv6(ip: string): number[] {
  const halves = ip.split("::");
  const left = halves[0] ? halves[0].split(":").map((h) => parseInt(h || "0", 16)) : [];
  const right = halves[1] ? halves[1].split(":").map((h) => parseInt(h || "0", 16)) : [];
  const missing = 8 - left.length - right.length;
  return [...left, ...Array(missing).fill(0), ...right];
}

/**
 * True when authentication from `ip` is allowed for a user whose
 * `allowed_cidrs` is `cidrs`. NULL / empty array = unrestricted.
 */
export function ipAllowed(
  ip: string | null | undefined,
  cidrs: string[] | null | undefined,
): boolean {
  if (!cidrs || cidrs.length === 0) return true;
  if (!ip) return false;
  return cidrs.some((c) => ipInCidr(ip, c.trim()));
}
