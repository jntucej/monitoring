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

import { useCallback, useEffect, useRef, useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";

/**
 * useDashboardData — a composite for dashboard reads.
 *
 * Wraps useApiResource (cached, deduped) and usePolling (visibility-aware) so
 * every dashboard gets the same correct behaviour with one call.
 *
 * - Cache key is url + userId — never shared across users.
 * - Polling is disabled while the tab is hidden.
 * - refreshKey increments on every successful refresh so WidgetBoundary can reset.
 *
 * The hook unwraps the standard ok() envelope ({ success, data: T }) internally,
 * so callers type T as the *inner* payload shape (e.g. `AlertsData`) and read
 * `data` directly as `T | null` — no `.data` access on the result.
 *
 * @deprecated `DashboardData<T>` and the `Envelope` alias types
 * (AlertsEnvelope, PeopleEnvelope, etc.) are retained for backward
 * compatibility but no longer needed: callers should pass the inner data
 * type directly to `useDashboardData<T>` and use `data` without unwrapping.
 */
export interface DashboardData<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refreshKey: number;
}

export function useDashboardData<T>(
  url: string | null,
  options: { ttlMs?: number; pollMs?: number; enabled?: boolean; poll?: boolean } = {}
): DashboardData<T> {
  // `poll` defaults to false: dashboards load once on mount and only
  // refresh when the user clicks the page's Refresh button. Passing
  // `pollMs` alone no longer enables auto-polling — pages that genuinely
  // need a live feed (e.g. the operator desk) must opt in with poll: true.
  const { ttlMs = 15000, pollMs = 30000, enabled = true, poll = false } = options;
  const userId = useAuthStore((s) => s.user?.id ?? "");
  // The cache is scoped per-user internally (see useApiResource below); the
  // URL no longer carries a `?_u=<uuid>` cache-buster — that was leaking the
  // caller's account UUID into every dashboard request (visible in devtools +
  // server logs) for no benefit now that polling is opt-in.
  const scopedUrl = url;

  // The ok() helper returns { success: true, data: T, ... } — we type the
  // fetch as the envelope and unwrap `.data` below so callers get T | null.
  const res = useApiResource<{ data: T } | null>(scopedUrl, {
    ttlMs,
    enabled: enabled && !!scopedUrl && userId !== "",
    deps: [userId],
  });
  const [refreshKey, setRefreshKey] = useState(0);

  // Stable access to the current refresh: useApiResource returns a fresh
  // result object on every render (its inner refresh is a useCallback, but
  // the *object* carrying it is not). Depending on the whole object made
  // `refresh` re-identify on every render, which drove usePolling's effect
  // (fn dep) into an immediate-tick burst loop. The ref below keeps
  // refresh stable while still calling the current underlying refresh.
  const refreshLiveRef = useRef(res.refresh);
  refreshLiveRef.current = res.refresh;

  const refresh = useCallback(async () => {
    await refreshLiveRef.current();
    setRefreshKey((k) => k + 1);
  }, []); // stable — the polling timer must never see it churn

  usePolling(
    async () => {
      await refresh();
    },
    { intervalMs: pollMs, enabled: enabled && !!scopedUrl && poll },
  );

  // Track loading for the very first paint only.
  const [firstLoad, setFirstLoad] = useState(true);
  useEffect(() => { if (!res.loading && firstLoad) setFirstLoad(false); }, [res.loading, firstLoad]);

  // Unwrap the { data: T } envelope so callers get T | null directly.
  const unwrapped: T | null = res.data?.data ?? null;

  return {
    data: unwrapped,
    loading: res.loading || firstLoad,
    error: res.error,
    refresh,
    refreshKey,
  };
}
