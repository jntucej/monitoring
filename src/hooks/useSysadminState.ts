"use client";

/**
 * useSysadminState — single fetch of GET /api/sysadmin/state with client
 * caching. Null-tolerant: a 403/500 degrades to an explicit error.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { SysadminState } from "@/app/api/sysadmin/state/route";

export function useSysadminState() {
  const [state, setState] = useState<SysadminState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(false);

  const refetch = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const res = await fetch("/api/sysadmin/state", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) {
        const code = body?.error?.code ?? String(res.status);
        throw new Error(code);
      }
      setState((body.data ?? body) as SysadminState);
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
