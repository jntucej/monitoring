"use client";

import { useEffect, useState } from "react";

type Health = "healthy" | "degraded" | "unhealthy" | "unknown";

const LABEL: Record<Health, string> = {
  healthy: "All systems listening",
  degraded: "Some systems quiet",
  unhealthy: "The instrument is resting",
  unknown: "Awaiting the first signal",
};

const DOT: Record<Health, string> = {
  healthy: "bg-cyan-300",
  degraded: "bg-amber-300",
  unhealthy: "bg-rose-300",
  unknown: "bg-slate-400",
};

export function LiveStatePill() {
  const [state, setState] = useState<Health>("unknown");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const s = d?.status ?? d?.data?.status;
        setState(
          s === "healthy" || s === "degraded" || s === "unhealthy"
            ? s
            : "unknown",
        );
      })
      .catch(() => {
        if (!cancelled) setState("unknown");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 backdrop-blur">
      <span className="relative flex h-2 w-2">
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full ${DOT[state]} opacity-50`}
        />
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${DOT[state]}`}
        />
      </span>
      <span className="text-xs tracking-wide text-white/65">
        {LABEL[state]}
      </span>
    </div>
  );
}
