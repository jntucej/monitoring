"use client";

/**
 * StatusBar — persistent bottom status strip for the role console.
 *
 * Replaces the KPI cards on the operator root. Shows the active gate,
 * today's entry/exit counts, current shift window, and the last scan time.
 * Counts are pulled from the board response `counts` object (already computed
 * server-side by /api/operator/transactions) — no extra requests.
 */

import { MapPin, Clock, ArrowDownLeft, ArrowUpRight, Timer } from "lucide-react";
import { useGateStore } from "@/stores/gateStore";

export interface StatusBarProps {
  counts: {
    total: number;
    entries: number;
    exits: number;
    manual: number;
    flagged: number;
  } | null;
  /** Timestamp of the newest scan (ISO). */
  lastScan?: string | null;
}

export function StatusBar({ counts, lastScan }: StatusBarProps) {
  const gate = useGateStore((s) => s.gate);

  const shiftWindow = (() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
    return { start, end };
  })();

  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <footer
      className="surface-card flex items-center justify-between gap-4 px-4 py-2 bg-bg-surface/95 backdrop-blur-md text-xs text-text-secondary select-none"
      aria-label="Status bar"
    >
      {/* Left: gate + shift */}
      <div className="flex items-center gap-4 min-w-0">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-text-muted shrink-0" />
          <span className="font-bold text-text-primary truncate">
            {gate?.name || "Gate not set"}
          </span>
          <span className="font-mono text-xs text-text-muted">
            {gate ? `ID ${gate.id.slice(0, 8)}` : "—"}
          </span>
        </span>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-text-muted">
          <Timer className="w-3.5 h-3.5" />
          Shift {fmt(shiftWindow.start)} – {fmt(shiftWindow.end)}
        </span>
      </div>

      {/* Right: counts + last scan */}
      <div className="flex items-center gap-4 shrink-0">
        <span className="inline-flex items-center gap-1.5">
          <ArrowDownLeft className="w-3.5 h-3.5 text-action-success" />
          <span className="font-mono tabular-nums text-action-success font-bold">{counts?.entries ?? 0}</span>
          <span className="text-text-muted">in</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ArrowUpRight className="w-3.5 h-3.5 text-action-danger" />
          <span className="font-mono tabular-nums text-action-danger font-bold">{counts?.exits ?? 0}</span>
          <span className="text-text-muted">out</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-text-muted">total</span>
          <span className="font-mono tabular-nums font-bold text-text-primary">{counts?.total ?? 0}</span>
        </span>
        {lastScan ? (
          <span className="hidden md:inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-text-muted">last</span>
            <span className="font-mono tabular-nums text-text-secondary">
              {new Date(lastScan).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </span>
        ) : null}
      </div>
    </footer>
  );
}
