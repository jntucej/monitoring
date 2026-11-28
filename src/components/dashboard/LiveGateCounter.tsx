"use client";

import React, { memo, useEffect, useState } from "react";
import { Radio } from "lucide-react";

export interface LiveGateCounterProps {
  endpoint?: string;
  initialCount?: number;
  label?: string;
}

/**
 * Isolated live SSE counter component.
 * Subscribes to `/api/gate/stream` via EventSource and updates ONLY its own local count.
 * Because state updates are contained entirely within this isolated component,
 * SSE events never trigger re-renders of the parent dashboard or static chart widgets.
 */
export const LiveGateCounter = memo(function LiveGateCounter({
  endpoint = "/api/gate/stream",
  initialCount = 0,
  label = "Live Campus Traffic:",
}: LiveGateCounterProps) {
  const [activeCount, setActiveCount] = useState<number>(initialCount);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    let es: EventSource | null = null;
    let isSubscribed = true;

    try {
      es = new EventSource(endpoint, { withCredentials: true });

      es.onopen = () => {
        if (isSubscribed) setIsConnected(true);
      };

      es.addEventListener("gate_status", (event: MessageEvent) => {
        if (!isSubscribed) return;
        try {
          const payload = JSON.parse(event.data);
          // payload has { type: "gate_status", totalActive, totalScans, ... }
          if (typeof payload.totalActive === "number") {
            setActiveCount(payload.totalActive);
          } else if (typeof payload.totalScans === "number") {
            setActiveCount(payload.totalScans);
          }
        } catch {
          // ignore parsing error
        }
      });

      es.addEventListener("connected", () => {
        if (isSubscribed) setIsConnected(true);
      });

      es.onerror = () => {
        if (isSubscribed) setIsConnected(false);
      };
    } catch {
      if (isSubscribed) setIsConnected(false);
    }

    return () => {
      isSubscribed = false;
      if (es) {
        es.close();
      }
    };
  }, [endpoint]);

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11.5px] font-semibold text-emerald-700 select-none shadow-2xs">
      <span className="relative flex h-2.5 w-2.5 items-center justify-center">
        {isConnected ? (
          <>
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </>
        ) : (
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        )}
      </span>
      <span>{label}</span>
      <span className="font-bold text-emerald-900 tabular-nums">
        {activeCount.toLocaleString()} {activeCount === 1 ? "active" : "active"}
      </span>
    </div>
  );
});
