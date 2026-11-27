"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNoMotion } from "../hooks/useNoMotion";
import { useLiveData } from "../hooks/useLiveData";
import { RollingDigits } from "./RollingDigits";

/**
 * LiveCountsStrip — the thin live-stat strip that SITS BELOW THE HERO.
 *
 * Every number goes through `RollingDigits` (useDigitRoll D). Reveal is a
 * simple whileInView fade + y.
 *
 * Data: `useLiveData` — onCampusNow, scansToday, requestsToday,
 * approvedToday. The strip shows: on campus, scans today, active gates,
 * and a REAL system-status cell (from /api/status) instead of a fabricated
 * "99.9% uptime" figure — the public health endpoint deliberately exposes
 * no uptime, so a static number here would be a silent invented metric.
 */

type SysStatus = "green" | "yellow" | "red";

function useSystemStatus(pollMs = 30_000): SysStatus | null {
  const [status, setStatus] = useState<SysStatus | null>(null);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const run = async () => {
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        if (res.ok) {
          const json = (await res.json()) as { status?: SysStatus };
          if (!cancelled && json.status) setStatus(json.status);
        }
      } catch {
        /* keep last known value */
      }
      if (!cancelled) timer = setTimeout(run, pollMs);
    };
    run();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pollMs]);
  return status;
}

export function LiveCountsStrip() {
  const reduced = useNoMotion();
  const live = useLiveData(30_000);
  const s = live?.stats;
  const sysStatus = useSystemStatus(30_000);

  // The live endpoint returns ONLY the four aggregate counters
  // (requests/approved/scans today + on-campus now); the richer payload
  // (modules/requests/scans) was stripped for security. Guard against a
  // missing `modules` array so the strip never throws and the
  // WidgetBoundary never reports "Widget failed to load".
  const activeGates =
    live?.modules?.filter((m) => m.id === "gate").length ?? 0;

  const items = [
    { label: "On campus now", value: s?.onCampusNow ?? 0 },
    { label: "Scans today", value: s?.scansToday ?? 0 },
    { label: "Active gates", value: activeGates },
  ];

  // Real status cell copy — no invented uptime percentage.
  const statusLabel: string =
    sysStatus === "green"
      ? "Operational"
      : sysStatus === "yellow"
        ? "Degraded"
        : sysStatus === "red"
          ? "Incident"
          : "Checking…";
  const statusColor =
    sysStatus === "green"
      ? "text-[var(--home-text-primary,var(--bg-surface))]"
      : sysStatus === "yellow"
        ? "text-[var(--home-text-primary,var(--bg-surface))]"
        : sysStatus === "red"
          ? "text-[var(--home-text-primary,var(--bg-surface))]"
          : "text-[var(--home-text-muted,var(--text-muted))]";

  return (
    <section
      aria-label="Live campus statistics"
      className="home-live-strip relative mx-auto mt-12 w-full max-w-6xl px-6"
    >
      {/* The single glass depth pane on the page. It sits BEHIND the strip
          (z-0) and is the ONLY backdrop-filter on the home page. It starts
          below the hero and is sized to the strip container, not the whole
          viewport. */}
      <div className="home-glass-pane pointer-events-none absolute inset-x-0 -top-4 bottom-4 z-0 rounded-3xl" />
      <motion.div
        className="relative z-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--home-border-soft,rgba(255,255,255,0.08))] md:grid-cols-5"
        initial={reduced ? false : { opacity: 0, y: 12 }}
        whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {items.map((it) => (
          <div key={it.label} className="bg-[var(--home-bg-elev-1,var(--bg-base))]/90 px-5 py-6 text-center">
            <p className="text-3xl font-bold text-[var(--home-text-primary,var(--bg-surface))] md:text-4xl">
              <RollingDigits value={it.value} cellHeight={44} />
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-[var(--home-text-muted,var(--text-muted))]">
              {it.label}
            </p>
          </div>
        ))}
        <div className="col-span-2 bg-[var(--home-bg-elev-1,var(--bg-base))]/90 px-5 py-6 text-center md:col-span-1">
          <p
            className={`text-2xl font-bold md:text-3xl ${statusColor}`}
            aria-label={`System status: ${statusLabel}`}
          >
            <span
              className="mr-1.5 inline-block size-2.5 rounded-full align-middle"
              style={{
                backgroundColor:
                  sysStatus === "green"
                    ? "var(--action-success, #10b981)"
                    : sysStatus === "yellow"
                      ? "var(--action-warning, #f59e0b)"
                      : sysStatus === "red"
                        ? "var(--action-danger, #ef4444)"
                        : "rgba(100,116,139,0.5)",
              }}
              aria-hidden
            />
            {statusLabel}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wider text-[var(--home-text-muted,var(--text-muted))]">
            System status
          </p>
        </div>
      </motion.div>
    </section>
  );
}
