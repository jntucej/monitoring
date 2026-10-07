"use client";

import React, { useEffect, useState } from "react";
import { WifiOff, AlertTriangle } from "lucide-react";

export function NetworkStatusBanner() {
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
    <div className="bg-rose-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-lg z-50 sticky top-0 border-b border-rose-700 animate-in slide-in-from-top duration-200">
      <WifiOff className="w-4 h-4 shrink-0 animate-pulse text-white" />
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <span>⚠️ Server Connection Required —</span>
        <span className="font-medium text-rose-100">
          Strict 100% Online Policy active. Scan & verification actions block immediately when server connection drops.
        </span>
      </div>
    </div>
  );
}
