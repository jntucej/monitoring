"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getAuthHeaders } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { singleFlightRefresh } from "@/lib/auth-refresh";

interface CachedEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CachedEntry<unknown>>();

/**
 * Structural equality for JSON-shaped API payloads (plain objects, arrays,
 * strings, numbers, booleans, null). Used to gate setData so a poll that
 * returns *identical* data does not mint a new object reference and force a
 * re-render of every consuming panel. Fast path: same reference => equal.
 */
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
  options: { ttlMs?: number; headers?: Record<string, string>; auth?: boolean } = {}
): Promise<T> {
  const { ttlMs = 15_000, headers, auth = true } = options;
  const now = Date.now();
  const hit = cache.get(url) as CachedEntry<T> | undefined;
  if (hit && hit.expiresAt > now) return hit.data;

  let res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(auth ? getAuthHeaders() : {}),
      ...headers,
    },
    credentials: "include",
  });

  // A 401 means the stored token went stale (e.g. session rotated/revoked
  // after a deploy, or a refreshed access token). Attempt one single-flight
  // refresh and retry once so dashboards self-heal instead of surfacing a
  // hard "HTTP 401" that only a full reload would clear.
  if (res.status === 401 && auth) {
    try { await singleFlightRefresh(); } catch { /* fall through */ }
    const fresh = getAuthHeaders();
    if (fresh["Authorization"] && fresh["Authorization"] !== (headers as Record<string,string>)["Authorization"]) {
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
  const { deps, enabled, ttlMs } = options;
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!url || enabled === false) {
      setLoading(false);
      return;
    }
    // Only the FIRST fetch shows a skeleton. Subsequent polls keep the
    // previous payload visible — no flicker, no layout shift.
    if (!hasLoadedRef.current) setLoading(true);
    setError(null);
    try {
      const next = await cachedFetch<T>(url, { ttlMs });
      // Only re-render when the payload actually changed. A poll that returns
      // identical data keeps the previous object reference, so downstream
      // memoized panels (useMemo / React.memo) do not re-run.
      setData((prev) => (prev !== null && deepEqual(prev, next) ? prev : next));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled, ttlMs, ...(deps || [])]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
