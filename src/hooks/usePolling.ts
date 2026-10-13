// src/hooks/usePolling.ts — patched by scripts/dashboard-fixup.mjs
// Fixes A2 (stable fn via ref, visibility-aware, jitter on mount).

import { useEffect, useRef } from "react";

export function usePolling(
  fn: () => Promise<unknown> | void,
  { intervalMs = 30_000, enabled = true }: { intervalMs?: number; enabled?: boolean } = {},
) {
  // Latest fn in a ref. The interval body always calls the newest one, but
  // the interval itself never tears down when fn changes — this is what
  // kills the "rebuild every render" storm on polling dashboards.
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const tick = async () => {
      if (cancelled || document.hidden) return;
      try {
        await fnRef.current();
      } catch {
        /* non-fatal */
      }
    };

    // Jittered first tick so mount doesn't collide with the sibling
    // useApiResource fetch that already fired on mount.
    const start = setTimeout(tick, 400 + Math.random() * 400);
    const id = setInterval(tick, intervalMs);

    const onVis = () => {
      if (!document.hidden) void tick();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      clearTimeout(start);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [intervalMs, enabled]);
}
