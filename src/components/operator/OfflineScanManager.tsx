"use client";

import React, { useEffect, useState } from "react";
import { getOfflineQueue, clearOfflineQueue, QueuedScan } from "@/lib/offlineQueue";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

export function OfflineScanManager() {
  const [isOnline, setIsOnline] = useState(true);
  const [queue, setQueue] = useState<QueuedScan[]>([]);
  const [syncing, setSyncing] = useState(false);
  const { token } = useAuthStore();
  const { addToast } = useUIStore();

  useEffect(() => {
    setIsOnline(navigator.onLine);
    setQueue(getOfflineQueue());

    const handleOnline = () => { setIsOnline(true); autoSync(); };
    const handleOffline = () => { setIsOnline(false); };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const autoSync = async () => {
    const pending = getOfflineQueue();
    if (pending.length === 0) return;
    await syncBatch(pending);
  };

  const syncBatch = async (items: QueuedScan[]) => {
    setSyncing(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/gate/scan/batch", {
        method: "POST",
        headers,
        body: JSON.stringify({ scans: items }),
      });
      const result = await res.json();
      if (result.success) {
        clearOfflineQueue();
        setQueue([]);
        addToast({ variant: "success", title: "Offline Sync Complete", message: `Synced ${items.length} queued scans.` });
      }
    } catch {
      addToast({ variant: "error", title: "Sync Failed", message: "Network error while syncing scans" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border)]">
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Badge variant="success" className="gap-1 text-xs">
            <Wifi className="h-3 w-3" /> Online
          </Badge>
        ) : (
          <Badge variant="error" className="gap-1 text-xs">
            <WifiOff className="h-3 w-3" /> Offline Mode
          </Badge>
        )}
      </div>

      {queue.length > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="offline" className="text-xs">
            {queue.length} Pending Scan{queue.length > 1 ? "s" : ""}
          </Badge>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => syncBatch(queue)}
            disabled={syncing || !isOnline}
            className="gap-1 text-xs"
          >
            <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Now"}
          </Button>
        </div>
      )}
    </div>
  );
}
