<<<<<<< HEAD
// src/hooks/usePolling.ts — patched by scripts/dashboard-fixup.mjs
// Fixes A2 (stable fn via ref, visibility-aware, jitter on mount).

=======
"use client";
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
import { useEffect, useRef } from "react";

export function usePolling(
  fn: () => Promise<unknown> | void,
  { intervalMs = 30_000, enabled = true }: { intervalMs?: number; enabled?: boolean } = {},
) {
<<<<<<< HEAD
  // Latest fn in a ref. The interval body always calls the newest one, but
  // the interval itself never tears down when fn changes — this is what
  // kills the "rebuild every render" storm on polling dashboards.
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
=======
  // Keep the latest fn in a ref so callers can pass a fresh inline callback
  // (or a memo that re-creates on unrelated state) without restarting the
  // timer. An effect re-run here is NOT harmless: it fires an immediate
  // tick, so an unstable fn turned a "30s poll" into a burst of ~30
  // back-to-back requests and drove the server into 429 rate-limit storms
  // (see /api/admin/overview 429 incident, 2026-10-23). The effect now
  // restarts only when intervalMs/enabled actually change.
  const fnRef = useRef(fn);
  fnRef.current = fn;
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const tick = async () => {
<<<<<<< HEAD
      if (cancelled || document.hidden) return;
      try {
        await fnRef.current();
      } catch {
        /* non-fatal */
=======
      if (cancelled) return;
      try { await fnRef.current(); } catch { /* non-fatal */ }
      if (!cancelled) timer = setTimeout(tick, intervalMs);
    };

    const onVis = () => {
      if (document.visibilityState === "hidden") {
        if (timer) { clearTimeout(timer); timer = null; }
      } else if (!timer) {
        void tick();
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
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
