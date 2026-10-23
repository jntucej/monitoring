"use client";
import { useEffect, useRef } from "react";

export function usePolling(
  fn: () => Promise<unknown> | void,
  { intervalMs = 30_000, enabled = true }: { intervalMs?: number; enabled?: boolean } = {}
) {
  // Keep the latest fn in a ref so callers can pass a fresh inline callback
  // (or a memo that re-creates on unrelated state) without restarting the
  // timer. An effect re-run here is NOT harmless: it fires an immediate
  // tick, so an unstable fn turned a "30s poll" into a burst of ~30
  // back-to-back requests and drove the server into 429 rate-limit storms
  // (see /api/admin/overview 429 incident, 2026-10-23). The effect now
  // restarts only when intervalMs/enabled actually change.
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      try { await fnRef.current(); } catch { /* non-fatal */ }
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
  }, [intervalMs, enabled]);
}
