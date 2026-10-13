// src/hooks/useApiResource.ts — patched by scripts/dashboard-fixup.mjs
// Fixes A1 (memoized refresh) and B2 (first-paint-only loading).

import { useCallback, useEffect, useRef, useState } from "react";

interface CachedEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CachedEntry<unknown>>();

export async function cachedFetch<T>(
  url: string,
  options: { ttlMs?: number; headers?: Record<string, string> } = {},
): Promise<T> {
  const { ttlMs = 30_000, headers } = options;
  const now = Date.now();
  const hit = cache.get(url) as CachedEntry<T> | undefined;
  if (hit && hit.expiresAt > now) return hit.data;

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const e = new Error(`HTTP ${res.status}`) as Error & { status?: number };
    e.status = res.status;
    throw e;
  }
  const data = (await res.json()) as T;
  cache.set(url, { data, expiresAt: now + ttlMs });
  return data;
}

export function clearCache(url?: string) {
  if (url) cache.delete(url);
  else cache.clear();
}

export interface ApiResource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useApiResource<T>(
  url: string | null,
  options: { deps?: unknown[]; enabled?: boolean; ttlMs?: number } = {},
): ApiResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!url || options.enabled === false) {
      setLoading(false);
      return;
    }
    // Only the FIRST fetch shows a skeleton. Subsequent polls keep the
    // previous payload visible — no flicker, no layout shift.
    if (!hasLoadedRef.current) setLoading(true);
    setError(null);
    try {
      const res = await cachedFetch<T>(url, { ttlMs: options.ttlMs ?? 30_000 });
      setData(res);
      hasLoadedRef.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, options.enabled, options.ttlMs]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
