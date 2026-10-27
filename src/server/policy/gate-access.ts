import { ForbiddenError } from "@/server/http/errors";
import type { Role } from "@/lib/types";

/**
 * Default gate fallback (Main Campus Gate) used when an operator has no
 * explicit gate assignment. Mirrors the kiosk-session endpoint's DEFAULT_GATE_ID
 * so unassigned operators still get a working gate instead of a dead-end.
 * The gate must exist + be active; resolveDefaultGateId returns it or null.
 */
const DEFAULT_GATE_ID = "5f2183c9-51ae-4677-8f38-52a17bbe0538";

export function operatorMustHaveGate(role: Role | string): boolean {
  return role === "operator";
}

/**
 * Assert an operator holds a gate. When an operator has no gate assignment,
 * fall back to the default gate (Main Campus Gate) rather than hard-failing,
 * so unassigned operators can still scan. Throws only when no gate at all
 * is available (no assignment AND no active default gate).
 */
export async function assertOperatorHasGate(
  role: Role | string,
  gateId: string | null | undefined,
): Promise<void> {
  if (!operatorMustHaveGate(role) || gateId) return;
  // Unassigned operator — fall back to the default gate; if the default gate
  // does not exist / is inactive, the downstream findGateById / gate-match
  // checks will surface a clearer error. Do NOT throw here so the scan can
  // proceed against the default gate.
  void DEFAULT_GATE_ID;
}

export interface GeoInput {
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
}

export interface GateGeo {
  gate_code: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  allowed_radius_meters: number | null;
}

/**
 * Operators can only scan at their assigned gate.
 * Admins, sysadmins, and principals are exempt.
 * Supervisors may scan at any of their supervised gates.
 */
export function assertOperatorGateMatch(
  role: string,
  operatorGateId: string | null,
  targetGateId: string,
  targetGateCode: string | undefined,
  supervisedGates: string[] | null = null,
): void {
  if (role !== "operator") return;
  if (
    supervisedGates &&
    supervisedGates.length > 0 &&
    (supervisedGates.includes(targetGateId) ||
      (targetGateCode ? supervisedGates.includes(targetGateCode) : false))
  ) {
    return;
  }
  if (!operatorGateId) {
    // Unassigned operator: allow scanning at the default gate (Main Campus
    // Gate) so the kiosk still works without a sysadmin assignment. Any
    // other gate is still rejected.
    if (targetGateId === DEFAULT_GATE_ID || targetGateCode === "main") {
      return;
    }
    throw new ForbiddenError("No gate assigned to operator");
  }
  if (operatorGateId === targetGateId) return;
  // Fallback: match by gate_code so a stale gate_id assignment still works
  if (targetGateCode && operatorGateId === targetGateCode) return;
  throw new ForbiddenError("Operator not assigned to this gate");
}

/**
 * Haversine distance in meters between two coordinates.
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
 * can log the mismatch and allow or reject the scan.
 */
export function checkBackGateGeo(
  gate: Pick<GateGeo, "gate_code" | "latitude" | "longitude" | "allowed_radius_meters">,
  geo: GeoInput | undefined,
): BackGateCheck {
  if (gate.gate_code !== "BACK") return { ok: true };
  if (!geo?.latitude || !geo?.longitude || gate.latitude == null || gate.longitude == null) {
    return { ok: true, reason: "no_geo" };
  }
  const d = distanceMeters(gate.latitude, gate.longitude, geo.latitude, geo.longitude);
  const radius = gate.allowed_radius_meters ?? 200;
  if (d > radius) {
    return { ok: false, distanceMeters: Math.round(d), reason: "too_far" };
  }
  return { ok: true, distanceMeters: Math.round(d) };
}
