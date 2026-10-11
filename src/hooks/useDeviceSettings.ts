"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

export type DeviceType = "thumb" | "face" | "barcode" | "qr";

export interface DeviceSetting {
  id: string;
  deviceType: DeviceType;
  enabled: boolean;
  scope: "global" | "gate" | "hostel";
  scopeId?: string;
}

interface DeviceSettingRow {
  id: string;
  device_type: DeviceType;
  enabled: boolean;
  scope: "global" | "gate" | "hostel";
  scope_id?: string | null;
}

/** Module-level cache with a 60s TTL so every mount doesn't re-hit the API. */
const CACHE_TTL_MS = 60_000;
let cache: { at: number; settings: DeviceSetting[] } | null = null;

function mapRow(row: DeviceSettingRow): DeviceSetting {
  return {
    id: row.id,
    deviceType: row.device_type,
    enabled: Boolean(row.enabled),
    scope: row.scope,
    scopeId: row.scope_id ?? undefined,
  };
}

/**
 * useDeviceSettings — fetches device verification settings from
 * `/api/admin/device-settings` (Step 5) once per TTL window and returns a lookup
 * map. `isEnabled(type)` is `true` only when an enabled setting of that type
 * exists.
 *
 * The endpoint is restricted to sysadmin/admin roles. For callers without
 * access (401/403) we fail open — `isEnabled` returns `true` — so approvers and
 * operators are never blocked by a permission they legitimately can't read; the
 * server-side route remains the authoritative enforcement point.
 */
export function useDeviceSettings(): {
  settings: DeviceSetting[];
  isEnabled: (deviceType: DeviceType) => boolean;
  loading: boolean;
  refresh: () => void;
} {
  const token = useAuthStore((s) => s.token);
  const [settings, setSettings] = useState<DeviceSetting[]>(
    () => cache?.settings ?? []
  );
  const [loading, setLoading] = useState<boolean>(!cache);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => {
    cache = null;
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      setSettings(cache.settings);
      setLoading(false);
      return;
    }

    let ignore = false;
    setLoading(true);

    fetch("/api/admin/device-settings", { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((json) => {
        if (ignore) return;
        const rows = Array.isArray(json?.data) ? (json.data as DeviceSettingRow[]) : [];
        const mapped = rows.map(mapRow);
        cache = { at: Date.now(), settings: mapped };
        setSettings(mapped);
      })
      .catch(() => {
        if (ignore) return;
        // Fail open: treat all device types as enabled when we can't read settings.
        const fallback: DeviceSetting[] = (["thumb", "face", "barcode", "qr"] as DeviceType[]).map((t) => ({
          id: t,
          deviceType: t,
          enabled: true,
          scope: "global",
        }));
        setSettings(fallback);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, nonce]);

  const isEnabled = useCallback(
    (deviceType: DeviceType): boolean =>
      settings.some((s) => s.deviceType === deviceType && s.enabled),
    [settings]
  );

  return { settings, isEnabled, loading, refresh };
}

export default useDeviceSettings;
