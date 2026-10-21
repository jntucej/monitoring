"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveData } from "./components/hooks/useLiveData";

function format(n: number | undefined): string {
  return typeof n === "number" ? n.toLocaleString("en-IN") : "—";
}

export function LiveStatsStrip() {
  const live = useLiveData(30_000);
  const s = live?.stats;
  const [announcement, setAnnouncement] = useState("");
  const prev = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (typeof s?.onCampusNow !== "number") return;
    if (typeof prev.current === "number" && s.onCampusNow !== prev.current) {
      const delta = s.onCampusNow - prev.current;
      setAnnouncement(
        `${Math.abs(delta)} ${delta > 0 ? "entered" : "left"} campus. ${s.onCampusNow} on campus now.`,
      );
    }
    prev.current = s.onCampusNow;
  }, [s?.onCampusNow]);

  const stats = [
    { label: "On campus now", value: format(s?.onCampusNow) },
    { label: "Scans today", value: format(s?.scansToday) },
    { label: "Requests today", value: format(s?.requestsToday) },
    { label: "Approved today", value: format(s?.approvedToday) },
  ];

  return (
    <>
      <section
        id="live"
        aria-label="Live campus statistics"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800/60 md:grid-cols-4"
      >
        {stats.map((m) => (
          <div key={m.label} className="bg-zinc-950/90 px-6 py-5 text-center">
            <p className="text-2xl font-bold tabular-nums text-zinc-50 md:text-3xl">
              {m.value}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
              {m.label}
            </p>
          </div>
        ))}
      </section>
      {/* Only announced when the on-campus count actually changes — not on every 30s poll */}
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
