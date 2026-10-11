/**
 * useDashboardData — a composite for dashboard reads.
 *
 * Wraps useApiResource (cached, deduped) and usePolling (visibility-aware) so
 * every dashboard gets the same correct behaviour with one call.
 *
 * - Cache key is url + userId — never shared across users.
 * - Polling is disabled while the tab is hidden.
 * - refreshKey increments on every successful refresh so WidgetBoundary can reset.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";

export interface DashboardData<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refreshKey: number;
}

export function useDashboardData<T>(
  url: string | null,
  options: { ttlMs?: number; pollMs?: number; enabled?: boolean } = {}
): DashboardData<T> {
  const { ttlMs = 15000, pollMs = 30000, enabled = true } = options;
  const userId = useAuthStore((s) => s.user?.id ?? "");
  const scopedUrl = url ? url + (url.includes("?") ? "&" : "?") + "_u=" + userId : null;

  const res = useApiResource<T>(scopedUrl, { ttlMs, enabled: enabled && !!scopedUrl });
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(async () => {
    await res.refresh();
    setRefreshKey((k) => k + 1);
  }, [res]);

  usePolling(async () => { await refresh(); }, { intervalMs: pollMs, enabled: enabled && !!scopedUrl });

  // Track loading for the very first paint only.
  const [firstLoad, setFirstLoad] = useState(true);
  useEffect(() => { if (!res.loading && firstLoad) setFirstLoad(false); }, [res.loading, firstLoad]);

  return {
    data: res.data,
    loading: res.loading || firstLoad,
    error: res.error,
    refresh,
    refreshKey,
  };
}
