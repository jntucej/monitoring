"use client";
import { useEffect } from "react";

export function usePolling(
  fn: () => Promise<unknown> | void,
  { intervalMs = 30_000, enabled = true }: { intervalMs?: number; enabled?: boolean } = {}
) {
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      try { await fn(); } catch { /* non-fatal */ }
      if (!cancelled) timer = setTimeout(tick, intervalMs);
    };

    const onVis = () => {
      if (document.visibilityState === "hidden") {
        if (timer) { clearTimeout(timer); timer = null; }
      } else if (!timer) {
        void tick();
      }
    };

    void tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [fn, intervalMs, enabled]);
}