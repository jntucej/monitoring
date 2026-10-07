/**
 * Client Geolocation & SysTag helper module
 */

export interface GeoLocationData {
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
  timestamp?: string;
}

export function getClientSysTag(): string {
  const env = typeof window !== "undefined" ? "WEB_CLIENT" : "SERVER";
  return `SYS_TAG_${env}_${Date.now()}`;
}

export async function getClientLocation(): Promise<GeoLocationData> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return { latitude: null, longitude: null };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Number(pos.coords.accuracy.toFixed(2)),
          timestamp: new Date().toISOString(),
        });
      },
      () => {
        // Fallback gracefully if permission denied or unavailable
        resolve({ latitude: null, longitude: null });
      },
      { timeout: 5000, enableHighAccuracy: true }
    );
  });
}