"use client";
// src/hooks/useOfflineRecovery.ts
//
// When the browser goes offline and comes back online, re-fire all
// pending API calls that failed due to the network drop. This is the
// "user on a bus arrives at destination" recovery: the app re-fetches
// everything it couldn't load while offline.
//
// Also re-runs usePolling's immediate tick on "online" so dashboards
// that use it refresh without waiting for the next interval.

import { useCallback, useEffect, useRef } from "react";

type PendingRefresh = () => Promise<void>;

const pendingRefreshes: Set<PendingRefresh> = new Set();
let onlineListenerAttached = false;

function ensureOnlineListener() {
  if (onlineListenerAttached || typeof window === "undefined") return;
  onlineListenerAttached = true;
  window.addEventListener("online", () => {
    pendingRefreshes.forEach((fn) => {
      fn().catch(() => undefined);
    });
    pendingRefreshes.clear();
  });
}

/**
 * Register a refresh function to be re-fired when the browser comes
 * back online. If the browser is already online, fires immediately.
 *
 * Call this from a useEffect cleanup to avoid leaks:
 *
 *   const refresh = useApiResource(...).refresh;
 *   useOfflineRecovery(refresh);
 */
export function useOfflineRecovery(refresh: PendingRefresh) {
  const ref = useRef(refresh);
  useEffect(() => {
    ref.current = refresh;
  });

  useEffect(() => {
    ensureOnlineListener();
    if (navigator.onLine) {
      // Already online — no need to register, but do an immediate
      // refresh in case the component just mounted after an offline
      // period and the data is stale.
      refresh().catch(() => undefined);
      return;
    }
    // Offline right now — register for the "online" event
    pendingRefreshes.add(() => ref.current());
    return () => {
      pendingRefreshes.delete(() => ref.current());
    };
  }, []);
}

/**
 * Simpler variant: just re-run `fn` on the next "online" event.
 * Use for one-shot fetches, not for polling loops.
 */
export function useOnlineRefetch(fn: PendingRefresh) {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    const handler = () => {
      fnRef.current().catch(() => undefined);
    };
    window.addEventListener("online", handler, { once: true });
    return () => window.removeEventListener("online", handler);
  }, []);
}
