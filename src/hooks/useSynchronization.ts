"use client";

/**
 * useSynchronization — PR-14. Honest live-activity synchronization state,
 * built ON TOP of the existing transport (usePolling + useOfflineRecovery),
 * not a second event system.
 *
 * The protocol (§PR-14): "If true live updates are unavailable, use honest
 * refresh behaviour and label the data accordingly." This app has no
 * principal SSE stream today, so this hook does NOT claim to be live. It
 * reports what is actually true:
 *   - mode: "refresh" (polling cadence) — never a false "live"
 *   - lastUpdated: the real timestamp of the last successful refresh
 *   - stale: true when now - lastUpdated exceeds the freshness window
 *   - connection: "online" | "offline" | "reconnecting" (browser network)
 *   - syncing: a refresh is in flight right now
 *   - error: the last refresh failure, when one exists (surfaced, not hidden)
 *
 * Reuse, don't fork: it drives the caller's existing refresh fn via
 * usePolling (visibility-aware, jittered — the established transport) and
 * re-fires on the browser's "online" event via useOfflineRecovery.
 */
import { useCallback, useEffect, useState } from "react";
import { usePolling } from "@/hooks/usePolling";
import { useOfflineRecovery } from "@/hooks/useOfflineRecovery";

export type SyncConnection = "online" | "offline" | "reconnecting";

export interface SynchronizationState {
  /** The data mode is HONEST refresh (polling), not live. */
  mode: "refresh";
  /** Epoch ms of the last successful refresh, or null (never loaded). */
  lastUpdated: number | null;
  /** True when now - lastUpdated > freshnessWindowMs (stale, not live). */
  stale: boolean;
  /** Browser network state (the transport's connection health). */
  connection: SyncConnection;
  /** A refresh is in flight right now. */
  syncing: boolean;
  /** The last refresh failure (surfaced honestly), or null. */
  error: string | null;
}

export interface UseSynchronizationOptions {
  /** The refresh fn to drive (the caller's useApiResource.refresh). */
  refresh: () => Promise<unknown> | void;
  /** Polling cadence. Default 60_000 (1 min). */
  intervalMs?: number;
  /** Data older than this is "stale" (display a refresh hint). Default 90s. */
  freshnessWindowMs?: number;
  /** Disable the poll (e.g. while a drawer covers the panel). */
  enabled?: boolean;
}

export function useSynchronization(
  opts: UseSynchronizationOptions,
): SynchronizationState {
  const {
    refresh,
    intervalMs = 60_000,
    freshnessWindowMs = 90_000,
    enabled = true,
  } = opts;

  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<SyncConnection>(
    typeof navigator !== "undefined" && !navigator.onLine
      ? "offline"
      : "online",
  );

  // Browser network → honest connection state (the transport's health).
  useEffect(() => {
    const onOnline = () => setConnection((c) => (c === "reconnecting" ? "online" : c));
    const onOffline = () => setConnection("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Drive the refresh via the EXISTING polling transport (visibility-aware).
  const runRefresh = useCallback(async () => {
    setSyncing(true);
    if (connection !== "online") setConnection("reconnecting");
    try {
      await refresh();
      setLastUpdated(Date.now());
      setError(null);
      if (connection !== "online") setConnection("online");
    } catch (e) {
      // A failed refresh is surfaced, not silently swallowed (protocol §2.6).
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setSyncing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  usePolling(runRefresh, { intervalMs, enabled });

  // Re-fire when the browser returns online (the existing offline-recovery
  // transport — not a new event system). useOfflineRecovery registers the
  // refresh on the shared "online" listener and cleans itself up on unmount.
  useOfflineRecovery(async () => {
    setConnection("online");
    await runRefresh();
  });

  // "Stale" is derived from a wall-clock tick, kept in state so the value is
  // computed OUT of render (no impure Date.now() in the render pass). A
  // lightweight interval re-evaluates it; no new transport is involved.
  const [stale, setStale] = useState(false);
  useEffect(() => {
    const recompute = () => {
      setStale(
        lastUpdated != null && Date.now() - lastUpdated > freshnessWindowMs,
      );
    };
    recompute();
    const id = setInterval(recompute, 15_000);
    return () => clearInterval(id);
  }, [lastUpdated, freshnessWindowMs]);

  return {
    mode: "refresh",
    lastUpdated,
    stale,
    connection,
    syncing,
    error,
  };
}
