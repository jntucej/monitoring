"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUIStore } from "@/stores/uiStore";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { getAuthHeaders } from "@/lib/utils";
import { clearAll, isQueueNonEmpty, markReplaying, pendingScans, removeScan } from "@/lib/scan-queue";

export interface ScanQueueSyncState {
  queuedCount: number;
  replaying: boolean;
  replayNow: () => Promise<void>;
  clearQueue: () => void;
  /** Refresh the queued-count display (call after local queue mutations). */
  refresh: () => void;
}

/**
 * Replays locally-queued offline scans in insertion order against the bulk
 * sync endpoint (POST /api/gate/logs). Auto-triggers on mount and on window
 * "online" events. Per-item results: "success" items are removed from the
 * queue; "error" items stay queued for the next attempt.
 */
export function useScanQueueSync(): ScanQueueSyncState {
  const [queuedCount, setQueuedCount] = useState(0);
  const [replaying, setReplaying] = useState(false);
  const replayingRef = useRef(false);
  const addToast = useUIStore((s) => s.addToast);

  const refreshCount = useCallback(() => {
    setQueuedCount(pendingScans().length);
  }, []);

  const replayNow = useCallback(async () => {
    if (replayingRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      addToast({
        variant: "warning",
        title: "Still Offline",
        message: "Cannot sync queued scans — network connection required.",
      });
      return;
    }
    if (!isQueueNonEmpty()) return;

    replayingRef.current = true;
    setReplaying(true);

    const items = pendingScans();
    markReplaying(items.map((s) => s.clientEventId));

    try {
      const res = await fetchWithTimeout(
        "/api/gate/logs",
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            scans: items.map((s) => ({
              roll: s.roll,
              direction: s.direction,
              reason: s.reason,
              entryType: s.entryType,
              gateId: s.gateId,
              isManual: false,
              clientEventId: s.clientEventId,
            })),
          }),
        },
        30_000
      );

      if (res.status === 401) {
        // Auth not in place yet — keep items queued, they'll retry on the next attempt.
        markReplaying([]);
        addToast({
          variant: "warning",
          title: "Sync Deferred",
          message: "Sign-in required to sync queued scans. They will sync automatically once a session is active.",
        });
        setQueuedCount(pendingScans().length);
        return;
      }

      const body = await res.json().catch(() => null);
      const results: Array<{ local_id?: string; status?: string }> | undefined = body?.data?.results;
      if (Array.isArray(results)) {
        let synced = 0;
        let failed = 0;
        for (const r of results) {
          const id = r.local_id;
          if (!id) continue;
          if (r.status === "success") {
            removeScan(id);
            synced += 1;
          } else {
            failed += 1;
          }
        }
        if (synced > 0) {
          addToast({
            variant: "success",
            title: "Scans Synced",
            message: `${synced} queued scan${synced === 1 ? "" : "s"} delivered to the server.`,
          });
        }
        if (failed > 0) {
          addToast({
            variant: "warning",
            title: "Some Scans Not Synced",
            message: `${failed} queued scan${failed === 1 ? "" : "s"} could not be delivered and will be retried.`,
          });
        }
      } else {
        markReplaying([]);
        addToast({
          variant: "warning",
          title: "Sync Incomplete",
          message: "Bulk sync response was unexpected. Queued scans will be retried.",
        });
      }
    } catch {
      // Network dropped mid-replay or request failed — keep everything queued.
      markReplaying([]);
      addToast({
        variant: "warning",
        title: "Sync Interrupted",
        message: "Queued scans could not be synced and will be retried when the network returns.",
      });
    } finally {
      replayingRef.current = false;
      setReplaying(false);
      refreshCount();
    }
  }, [addToast, refreshCount]);

  const clearQueue = useCallback(() => {
    clearAll();
    setQueuedCount(0);
    addToast({
      variant: "info",
      title: "Queue Cleared",
      message: "All locally queued scans were discarded without syncing.",
    });
  }, [addToast]);

  useEffect(() => {
    refreshCount();

    let disposed = false;
    const tryReplay = () => {
      if (disposed) return;
      void replayNow();
    };

    if (isQueueNonEmpty() && typeof navigator !== "undefined" && navigator.onLine) {
      void replayNow();
    }

    window.addEventListener("online", tryReplay);
    return () => {
      disposed = true;
      window.removeEventListener("online", tryReplay);
    };
  }, [replayNow, refreshCount]);

  // Keep the count fresh if items were queued from another tab via confirmScan.
  useEffect(() => {
    const onStorage = () => refreshCount();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshCount]);

  return { queuedCount, replaying, replayNow, clearQueue, refresh: refreshCount };
}


