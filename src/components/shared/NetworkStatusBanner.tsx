"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { useOperatorStore } from "@/stores/operatorStore";
import { useUIStore } from "@/stores/uiStore";

export function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const { offlineQueue, flushOfflineQueue, setOnline } = useOperatorStore();
  const { addToast } = useUIStore();
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Detect online/offline browser state
    setIsOnline(navigator.onLine);
    setOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setOnline(true);
      addToast({
        title: "Connection Restored",
        message: "Back online. Syncing queued gate scans...",
        variant: "success",
      });
      if (offlineQueue.length > 0) {
        handleSync();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setOnline(false);
      addToast({
        title: "Offline Mode Active",
        message: "Network connection lost. Gate scans will be queued locally.",
        variant: "warning",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [offlineQueue.length]);

  const handleSync = async () => {
    setIsSyncing(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    flushOfflineQueue();
    setIsSyncing(false);
    addToast({
      title: "Sync Complete",
      message: "All offline gate scans sent to backend server.",
      variant: "success",
    });
  };

  if (isOnline && offlineQueue.length === 0) {
    return null;
  }

  return (
    <div
      className={`w-full h-10 px-4 flex items-center justify-between text-xs font-semibold select-none transition-all ${
        !isOnline
          ? "bg-[var(--action-danger)]/90 text-white"
          : "bg-[var(--action-warning)]/90 text-slate-900"
      }`}
    >
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
            <span>
              Offline — {offlineQueue.length > 0 ? `${offlineQueue.length} scans queued locally` : "Reconnecting to campus server..."}
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Online — {offlineQueue.length} unsynced local scan(s)</span>
          </>
        )}
      </div>

      {offlineQueue.length > 0 && (
        <button
          onClick={handleSync}
          disabled={isSyncing || !isOnline}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing..." : "Sync Now"}
        </button>
      )}
    </div>
  );
}
