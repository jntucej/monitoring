"use client";

import { useEffect, useState } from "react";

type Health = "healthy" | "degraded" | "unhealthy" | "unknown";

const POLL_MS = 30_000;

const LABEL: Record<Health, string> = {
  healthy: "Operational",
  degraded: "Degraded",
  unhealthy: "Down",
  unknown: "Unknown",
};

const DOT: Record<Health, string> = {
  healthy: "bg-emerald-400",
  degraded: "bg-amber-400",
  unhealthy: "bg-rose-500",
  unknown: "bg-slate-400",
};

export function LiveStatePill() {
  const [health, setHealth] = useState<Health>("unknown");

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch("/api/health", { cache: "no-store" });
        const data = await r.json().catch(() => null);
        if (!cancelled) setHealth((data?.status as Health) ?? "unknown");
      } catch {
        if (!cancelled) setHealth("unknown");
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/70 backdrop-blur"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[health]}`} />
      <span>{LABEL[health]}</span>
    </span>
  );
}
