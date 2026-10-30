"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfflineBannerProps {
  /** When true, scanning is disabled. */
  onRetry?: () => void;
}

export function OfflineBanner({ onRetry }: OfflineBannerProps) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      className={cn(
        "bg-rose-600 text-white px-4 py-3 text-sm font-bold flex items-center justify-between gap-3 shadow-lg",
        "z-50 sticky top-0 border-b border-rose-700 animate-in slide-in-from-top duration-200"
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-2 min-w-0">
        <WifiOff className="w-5 h-5 shrink-0 animate-pulse text-white" />
        <span className="flex items-center gap-1.5 flex-wrap">
          <span>No network — scanning paused</span>
        </span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors shrink-0"
          aria-label="Retry connection"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
