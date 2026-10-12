"use client";
import { useCallback, useEffect, useState } from "react";

interface CachedEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CachedEntry<unknown>>();

export async function cachedFetch<T>(
  url: string,
  options: { ttlMs?: number; headers?: Record<string, string> } = {}
): Promise<T> {
  const { ttlMs = 15_000, headers } = options;
  const now = Date.now();
  const cached = memoryCache.get(url) as CachedEntry<T> | undefined;

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }

  const data = (await res.json()) as T;
  memoryCache.set(url, { data, expiresAt: now + ttlMs });
  return data;
}

export function clearCache(url?: string) {
  if (url) memoryCache.delete(url);
  else memoryCache.clear();
}

export interface ApiResource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useApiResource<T>(
  url: string | null,
  options: { deps?: unknown[]; enabled?: boolean; ttlMs?: number } = {}
): ApiResource<T> {
  const { enabled = true, ttlMs = 15_000 } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(url && enabled));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!url || !enabled) return;
    // Clear the entry first so a *failing* cached fetch (or a stale cache)
    // can't mask a genuine re-fetch on Retry.
    clearCache(url);
    setLoading(true);
    setError(null);
    try {
      setData(await cachedFetch<T>(url, { ttlMs }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [url, enabled, ttlMs]);

  useEffect(() => {
    void refresh();
  }, [refresh, ...(options.deps ?? [])]);

  return { data, loading, error, refresh };
}