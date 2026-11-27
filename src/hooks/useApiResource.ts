"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getAuthHeaders } from "@/lib/utils";
import { singleFlightRefresh } from "@/lib/auth-refresh";

interface CachedEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CachedEntry<unknown>>();
const listeners = new Map<string, Set<() => void>>();

function subscribeUrl(url: string, cb: () => void): () => void {
  let set = listeners.get(url);
  if (!set) {
    set = new Set();
    listeners.set(url, set);
  }
  set.add(cb);
  return () => {
    set?.delete(cb);
    if (set && set.size === 0) listeners.delete(url);
  };
}

/**
 * Invalidate cached API entries matching one or more URL prefixes (or exact URLs)
 * and immediately trigger background revalidation on all mounted `useApiResource`
 * hooks subscribed to matching URLs.
 */
export function invalidateApiCache(prefixOrKeys?: string | string[]) {
  if (!prefixOrKeys) {
    cache.clear();
    for (const set of listeners.values()) {
      for (const cb of set) cb();
    }
    return;
  }
  const prefixes = Array.isArray(prefixOrKeys) ? prefixOrKeys : [prefixOrKeys];
  for (const k of Array.from(cache.keys())) {
    const urlPart = k.includes("|") ? k.slice(k.indexOf("|") + 1) : k;
    if (prefixes.some((p) => urlPart.startsWith(p))) {
      cache.delete(k);
    }
  }
  for (const [url, set] of listeners.entries()) {
    if (prefixes.some((p) => url.startsWith(p))) {
      for (const cb of set) cb();
    }
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
  }
  return true;
}

export async function cachedFetch<T>(
  url: string,
  options: { ttlMs?: number; headers?: Record<string, string>; auth?: boolean; bypassCache?: boolean } = {}
): Promise<T> {
  const { ttlMs = 15_000, headers, auth = true, bypassCache = false } = options;
  const now = Date.now();
  const userId = typeof window !== "undefined" ? (window as { __currentUserId?: string }).__currentUserId ?? "anon" : "anon";
  const key = `${userId}|${url}`;
  const hit = cache.get(key) as CachedEntry<T> | undefined;
  if (!bypassCache && hit && hit.expiresAt > now) return hit.data;

  let res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(auth ? getAuthHeaders() : {}),
      ...headers,
    },
    credentials: "include",
  });

  if (res.status === 401 && auth) {
    try { await singleFlightRefresh(); } catch { /* fall through */ }
    const fresh = getAuthHeaders();
    if (fresh["Authorization"] && fresh["Authorization"] !== (headers as Record<string, string> | undefined)?.["Authorization"]) {
      res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...fresh,
          ...headers,
        },
        credentials: "include",
      });
    }
  }

  if (!res.ok) {
    const e = new Error(`HTTP ${res.status}`) as Error & { status?: number };
    e.status = res.status;
    throw e;
  }
  const data = (await res.json()) as T;
  cache.set(key, { data, expiresAt: now + ttlMs });
  return data;
}

export function clearCache(url?: string) {
  if (url) {
    for (const k of Array.from(cache.keys())) {
      const urlPart = k.includes("|") ? k.slice(k.indexOf("|") + 1) : k;
      if (urlPart === url) cache.delete(k);
    }
  } else {
    cache.clear();
  }
}

export function clearCacheForUser(userId: string | null) {
  if (!userId) return;
  const prefix = `${userId}|`;
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k);
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
  const { enabled, ttlMs } = options;
  const hasLoadedRef = useRef(false);
  const lastRevalidateRef = useRef(0);

  const refresh = useCallback(async (bypassCache = false) => {
    if (!url || enabled === false) {
      setLoading(false);
      return;
    }
    if (!hasLoadedRef.current) setLoading(true);
    setError(null);
    try {
      const next = await cachedFetch<T>(url, { ttlMs, bypassCache });
      hasLoadedRef.current = true;
      setData((prev) => (prev !== null && deepEqual(prev, next) ? prev : next));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [url, enabled, ttlMs]);

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  useEffect(() => {
    if (!url || enabled === false) return;
    const unsub = subscribeUrl(url, () => {
      void refresh(true);
    });

    const throttledRevalidate = () => {
      const now = Date.now();
      if (now - lastRevalidateRef.current < 5_000) return;
      lastRevalidateRef.current = now;
      void refresh(true);
    };

    const onVis = () => {
      if (document.visibilityState === "visible") throttledRevalidate();
    };
    const onOnline = () => throttledRevalidate();

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    return () => {
      unsub();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
    };
  }, [url, enabled, refresh]);

  const publicRefresh = useCallback(() => refresh(true), [refresh]);

  return { data, loading, error, refresh: publicRefresh };
}
