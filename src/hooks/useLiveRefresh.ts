"use client";

import { useEffect, useRef, useCallback } from "react";
import { useGlass } from "@/context/GlassContext";

/**
 * useLiveRefresh — connect a page's data refetch to the global Live Data toggle.
 * 
 * Includes initial delay with jitter to prevent request bursts on mount.
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

  useEffect(() => {
    if (!enabled) return;
    refetchRef.current();
    didInitialRun.current = true;
  }, [enabled]);

  const prevLive = useRef(isLiveStream);
  useEffect(() => {
    if (!enabled) return;
    const wasLive = prevLive.current;
    prevLive.current = isLiveStream;
    if (isLiveStream && !wasLive && didInitialRun.current) {
      refetchRef.current();
    }
  }, [isLiveStream, enabled]);

  useEffect(() => {
    if (!enabled || !intervalMs || !isLiveStream) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const baseMs = intervalMs;
    const schedule = (delayMs: number) => {
      if (stopped) return;
      timer = setTimeout(async () => {
        if (stopped) return;
        try {
          await refetchRef.current();
        } catch (err) {
          const msg = String(err);
          if (msg.includes('UNAUTHORIZED') || msg.includes('401') || msg.includes('SESSION')) {
            stopped = true;
            return;
          }
        }
        const jitter = baseMs * 0.1 * (Math.random() * 2 - 1);
        schedule(baseMs + jitter);
      }, delayMs);
    };

    const initialDelay = 500 + Math.random() * 2500;
    schedule(initialDelay);

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [intervalMs, enabled, isLiveStream]);

  const refreshNow = useCallback(() => {
    refetchRef.current();
  }, []);

  return refreshNow;
}
