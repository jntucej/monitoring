"use client";

/* ── fetch helper for principal components ── */

import { clearCache, cachedFetch } from "@/hooks/useApiResource";
import { getAuthHeaders } from "@/hooks/useAuthHeaders";

/* ── in-flight dedup for fetchJson ── */
const inflight = new Map<string, Promise<Resp>>();

/* ── fetch helper ── */

export type Resp = { success: boolean; data?: unknown; error?: { message?: string } };

export function fetchJson(url: string): Promise<Resp> {
  const existing = inflight.get(url);
  if (existing) return existing;
  const p = (async (): Promise<Resp> => {
    try {
      const d = await cachedFetch<Resp>(url, {
        ttlMs: 10_000,
        headers: getAuthHeaders(),
      });
      return d ?? { success: false, error: { message: "Empty response" } };
    } catch (e) {
      return { success: false, error: { message: e instanceof Error ? e.message : "Request failed" } };
    } finally {
      inflight.delete(url);
    }
  })();
  inflight.set(url, p);
  return p;
}

export { clearCache };
