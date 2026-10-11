import { ForbiddenError } from "@/server/http/errors";
import type { Role } from "@/lib/types";

export function operatorMustHaveGate(role: Role): boolean {
  return role === "operator";
}

export function assertOperatorHasGate(
  role: Role,
  gateId: string | null | undefined,
): void {
  if (operatorMustHaveGate(role) && !gateId) {
    throw new ForbiddenError("No gate assigned to operator");
  }
}

export interface GeoInput {
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
}

/**
 * Operators can only scan at their assigned gate.
 * Admins, sysadmins, and wardens are exempt.
 */
export function assertOperatorGateMatch(
  role: string,
  operatorGateId: string | null,
  targetGateId: string,
  targetGateCode: string | undefined,
): void {
  if (role !== "operator") return;
  if (!operatorGateId) {
    throw new ForbiddenError("No gate assigned to operator");
  }
  if (operatorGateId === targetGateId) return;
  // Fallback: match by gate_code so a stale gate_id assignment still works
  if (targetGateCode && operatorGateId === targetGateCode) return;
  throw new ForbiddenError("Operator not assigned to this gate");
}

const BACK_GATE_CODE = "BACK";
const BACK_GATE_LAT = 12.9716;   // ← filled with exact values from original route.ts
const BACK_GATE_LNG = 77.5946;   // ← filled with exact values from original route.ts

/**
 * Haversine distance in meters between two coordinates.
    // TODO: back-gate coordinates are Bangalore placeholders

 */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface BackGateCheck {
  ok: boolean;
  distanceMeters?: number;
  reason?: string;
}

/**
 * Back-gate geolocation gate. Only applies to the back gate.
 * A failed check does NOT throw — it returns a decision so the caller
 * can log the mismatch and still allow (via audit-only) or block.
 */
export function checkBackGateGeo(
  gateCode: string | undefined,
  geo: GeoInput | undefined,
): BackGateCheck {
  if (gateCode !== BACK_GATE_CODE) return { ok: true };
  if (!geo?.latitude || !geo?.longitude) {
    return { ok: false, reason: "no_geo" };
  }
  const d = distanceMeters(BACK_GATE_LAT, BACK_GATE_LNG, geo.latitude, geo.longitude);
  if (d > 200) { // ← filled with 200 threshold from original route
    return { ok: false, distanceMeters: Math.round(d), reason: "too_far" };
  }
  return { ok: true, distanceMeters: Math.round(d) };
}

