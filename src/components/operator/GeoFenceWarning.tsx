"use client";

// Geo-fence gate for the BACK gate: before an OUT (or any) scan is recorded
// at a geofenced gate, the desk computes the kiosk's distance to the gate
// and, when outside the allowed radius, shows a warning dialog with a
// "Continue anyway" escape hatch that records the deviation in the audit.


import { MapPinOff } from "lucide-react";
import { getClientLocation } from "@/lib/geo";
import { Button } from "@/components/ui/button";


export type GeoFenceWarningProps = {
  distanceMeters: number;
  allowedRadiusMeters: number;
  gateName: string;
  onContinue: () => void;
  onCancel: () => void;
};

/**
 * Haversine great-circle distance in meters. Standard formula; accurate to
 * sub-meter on the 10–300 m scale a kiosk cares about.
 */
export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000; // mean earth radius, meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function GeoFenceWarning({
  distanceMeters,
  allowedRadiusMeters,
  gateName,
  onContinue,
  onCancel,
}: GeoFenceWarningProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Off-fence at ${gateName}`}
      className="fixed inset-x-0 bottom-0 z-80 mx-auto w-full max-w-md p-4"
    >
      <div className="rounded-2xl border border-amber-500/40 bg-[var(--bg-surface)] p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <MapPinOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Outside {gateName} fence
            </h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              The kiosk is{" "}
              <strong className="text-amber-400">
                {Math.round(distanceMeters)} m
              </strong>{" "}
              from the gate (allowed radius {Math.round(allowedRadiusMeters)} m).
              Recording the scan now will flag the deviation in the audit log.
            </p>
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={onContinue}>
            Continue anyway
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Resolves the kiosk's current location, or null when unavailable. The desk
 * wraps this: if it resolves null (permission denied / no GPS / a null
 * coordinate), the scan proceeds without a fence check — a fence warning
 * must never hard-block a gate.
 */
export async function resolveKioskLocation(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  try {
    const loc = await getClientLocation();
    if (loc == null || loc.latitude == null || loc.longitude == null) return null;
    return { latitude: loc.latitude, longitude: loc.longitude };
  } catch {
    return null;
  }
}
