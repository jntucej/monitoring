"use client";

import { useEffect, useRef, useCallback } from "react";
import { useGlass } from "@/context/GlassContext";

/**
 * useLiveRefresh — connect a page's data refetch to the global Live Data toggle.
 *
 * When the Live Data header pill is toggled from Paused → Live, `refetch()` is
 * fired once so pages that were frozen show fresh data immediately. While Live,
 * an optional `intervalMs` polling loop stays active; while Paused it is
 * suspended so no unnecessary requests hit the server.
 *
 * This lets operators use the single global Live button instead of per-page
 * "Refresh" buttons — the button now actually drives all subscribing pages.
 */
export function useLiveRefresh(
  refetch: () => Promise<unknown> | void,
  options: { intervalMs?: number; enabled?: boolean } = {}
) {
  const { isLiveStream } = useGlass();
  const { intervalMs, enabled = true } = options;
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const didInitialRun = useRef(false);

  // Re-run on first mount to populate data.
  useEffect(() => {
    if (!enabled) return;
    refetchRef.current();
    didInitialRun.current = true;
     
  }, [enabled]);

  // Fire once when transitioning from Paused → Live.
  const prevLive = useRef(isLiveStream);
  useEffect(() => {
    if (!enabled) return;
    const wasLive = prevLive.current;
    prevLive.current = isLiveStream;
    if (isLiveStream && !wasLive && didInitialRun.current) {
      refetchRef.current();
    }
  }, [isLiveStream, enabled]);

  // Poll interval gated on live state.
  useEffect(() => {
    if (!enabled || !intervalMs || !isLiveStream) return;
    const id = setInterval(() => refetchRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled, isLiveStream]);

  const refreshNow = useCallback(() => {
    refetchRef.current();
  }, []);

  return refreshNow;
}