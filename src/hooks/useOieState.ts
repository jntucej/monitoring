"use client";

/**
 * useOieState — single fetch of GET /api/oie/state with client caching +
 * refetch. Mirrors usePrincipalState. Null-tolerant: a 403/500 degrades to an
 * explicit error state, never fabricated data.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { OieState } from "@/app/api/oie/state/route";

export function useOieState() {
  const [state, setState] = useState<OieState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(false);

  const refetch = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const res = await fetch("/api/oie/state", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) {
        const code = body?.error?.code ?? String(res.status);
        throw new Error(code);
      }
      setState((body.data ?? body) as OieState);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "FAILED");
    } finally {
      inflight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { state, loading, error, refetch };
}
