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
import { useOperatorStore } from "@/stores/operatorStore";

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
  const gate = useOperatorStore((s) => s.gate);

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
      className="flex items-center justify-between gap-4 px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur-md text-[11px] text-[var(--text-secondary)] select-none"
      aria-label="Status bar"
    >
      {/* Left: gate + shift */}
      <div className="flex items-center gap-4 min-w-0">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
          <span className="font-bold text-[var(--text-primary)] truncate">
            {gate?.name || "Gate not set"}
          </span>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            {gate ? `ID ${gate.id.slice(0, 8)}` : "—"}
          </span>
        </span>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[var(--text-muted)]">
          <Timer className="w-3.5 h-3.5" />
          Shift {fmt(shiftWindow.start)} – {fmt(shiftWindow.end)}
        </span>
      </div>

      {/* Right: counts + last scan */}
      <div className="flex items-center gap-4 shrink-0">
        <span className="inline-flex items-center gap-1.5">
          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono tabular-nums text-emerald-400 font-bold">{counts?.entries ?? 0}</span>
          <span className="text-[var(--text-muted)]">in</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ArrowUpRight className="w-3.5 h-3.5 text-[var(--action-danger)]" />
          <span className="font-mono tabular-nums text-[var(--action-danger)] font-bold">{counts?.exits ?? 0}</span>
          <span className="text-[var(--text-muted)]">out</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-[var(--text-muted)]">total</span>
          <span className="font-mono tabular-nums font-bold text-[var(--text-primary)]">{counts?.total ?? 0}</span>
        </span>
        {lastScan ? (
          <span className="hidden md:inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="text-[var(--text-muted)]">last</span>
            <span className="font-mono tabular-nums text-[var(--text-secondary)]">
              {new Date(lastScan).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </span>
        ) : null}
      </div>
    </footer>
  );
}
