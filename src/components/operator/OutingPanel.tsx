"use client";

import { motion } from "framer-motion";
import { Clock3 } from "lucide-react";
import type { OutingEntry } from "@/lib/types";

interface OutingPanelProps {
  entries: OutingEntry[];
}

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function OutingPanel({ entries }: OutingPanelProps) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Clock3 className={`w-4 h-4 ${entries.some((e) => e.overdue) ? "text-red-400" : "text-amber-400"}`} />
          On Outing (No Permission)
          <span className="px-1.5 py-0.5 rounded-full bg-[var(--bg-base)] text-[10px] font-bold text-[var(--text-muted)]">
            {entries.length}
          </span>
        </h3>
        <p className="text-[10px] text-[var(--text-muted)]">
          Short outings · {entries[0]?.limitMinutes ?? 180}m limit
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="py-5 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
          <Clock3 className="w-3.5 h-3.5" />
          No one is out on an outing right now.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e, i) => (
            <motion.div
              key={e.userId + e.outAt}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border ${
                e.overdue
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-[var(--border)] bg-[var(--bg-base)]"
              }`}
            >
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{e.name || "Unknown"}</p>
                <p className="text-[10px] font-mono text-[var(--text-muted)]">
                  {e.roll} · out since {new Date(e.outAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="text-right shrink-0">
                {e.overdue ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold">
                    OVERDUE · {fmtDuration(e.minutesGone)}
                  </span>
                ) : (
                  <>
                    <p className="text-xs font-bold tabular-nums text-amber-400">{fmtDuration(e.minutesGone)} gone</p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {fmtDuration(Math.max(0, e.limitMinutes - e.minutesGone))} left
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
