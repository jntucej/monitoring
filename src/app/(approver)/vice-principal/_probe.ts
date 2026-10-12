"use client";

import { useCallback, useEffect, useState } from "react";
import { cachedFetch } from "@/hooks/useApiResource";

/* Probe result type: distinguish 403 from real errors */
export interface ProbeResult<T = unknown> {
  data: T | null;
  restricted: boolean;
  error: string | null;
  loading: boolean;
}

/**
 * Probe a read-only endpoint that may return 403 for the VP tier.
 * On success the data is cached (ttlMs); on 403 the panel shows a clean
 * "restricted at this tier" empty-state instead of an error banner.
 */
export function useProbe<T>(url: string | null, ttlMs = 30_000): ProbeResult<T> {
  const [state, setState] = useState<ProbeResult<T>>({
    data: null,
    restricted: false,
    error: null,
    loading: true,
  });

  const probe = useCallback(async () => {
    if (!url) {
      setState({ data: null, restricted: false, error: null, loading: false });
      return;
    }
    try {
      const data = await cachedFetch<T>(url, { ttlMs });
      setState({ data, restricted: false, error: null, loading: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      if (msg.includes("403")) {
        setState({ data: null, restricted: true, error: null, loading: false });
      } else {
        setState({ data: null, restricted: false, error: msg, loading: false });
      }
    }
  }, [url, ttlMs]);

  useEffect(() => {
    void probe();
  }, [probe]);

  // Re-probe on manual refresh (403s are uncached, so this is a real re-fetch)
  useEffect(() => {
    const handler = () => void probe();
    window.addEventListener("vp-probe-refresh", handler);
    return () => window.removeEventListener("vp-probe-refresh", handler);
  }, [probe]);

  return state;
}
