"use client";

import { useEffect, useRef } from "react";

export function usePolling(
  fn: () => Promise<unknown> | void,
  { intervalMs = 30_000, enabled = true }: { intervalMs?: number; enabled?: boolean } = {},
) {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastTickAt = 0;

    const tick = async () => {
      if (cancelled || document.visibilityState === "hidden") return;
      lastTickAt = Date.now();
      try {
        await fnRef.current();
      } catch {
        /* non-fatal */
      }
      if (!cancelled && document.visibilityState === "visible") {
        timer = setTimeout(tick, intervalMs);
      }
    };

    const onVis = () => {
      if (document.visibilityState === "hidden") {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      } else {
        const elapsed = Date.now() - lastTickAt;
        if (elapsed >= intervalMs) {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          void tick();
        } else if (!timer) {
          timer = setTimeout(tick, Math.max(250, intervalMs - elapsed));
        }
      }
    };

    const onOnline = () => {
      if (document.visibilityState === "visible") {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        void tick();
      }
    };

    const start = setTimeout(tick, 400 + Math.random() * 400);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      clearTimeout(start);
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
    };
  }, [intervalMs, enabled]);
}
