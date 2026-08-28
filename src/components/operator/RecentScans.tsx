"use client";
import React, { useState } from "react";
import { User, ArrowDownLeft, ArrowUpRight, ChevronRight, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import type { Scan } from "@/lib/types";
import { useGlossyMotion, staggerContainer, fadeInUp } from "@/lib/animations";

interface RecentScansProps {
  scans: Scan[];
  onSelect?: (scan: Scan) => void;
}

type FilterTab = "ALL" | "IN" | "OUT" | "FLAGGED";

export function RecentScans({ scans, onSelect }: RecentScansProps) {
  const isGlossyMotion = useGlossyMotion();
  const [filter, setFilter] = useState<FilterTab>("ALL");

  const filteredScans = (scans || []).filter((scan) => {
    if (filter === "IN") return scan.direction === "IN";
    if (filter === "OUT") return scan.direction === "OUT";
    if (filter === "FLAGGED") {
      const s = scan as any;
      return (
        s.status === "FLAGGED" ||
        s.flagged ||
        scan.reason?.toLowerCase().includes("flag") ||
        scan.reason?.toLowerCase().includes("late") ||
        scan.reason?.toLowerCase().includes("curfew")
      );
    }
    return true;
  });

  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-5 space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">Recent Access Activity</h3>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Tap any record to open the person overview.</p>
        </div>

        {/* Live Filter Stream Tabs */}
        <div className="flex items-center gap-1 bg-[var(--bg-elevated)] p-1 rounded-xl border border-[var(--border)] self-start sm:self-auto">
          {(["ALL", "IN", "OUT", "FLAGGED"] as FilterTab[]).map((tab) => {
            const isActive = filter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider transition-all ${
                  isActive
                    ? tab === "IN"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : tab === "OUT"
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      : tab === "FLAGGED"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-[var(--action-primary)] text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      <motion.div
        variants={isGlossyMotion ? staggerContainer : {}}
        initial={isGlossyMotion ? "hidden" : false}
        animate={isGlossyMotion ? "visible" : undefined}
        className="space-y-3.5 overscroll-y-contain max-h-[420px] overflow-y-auto custom-scrollbar"
      >
        {filteredScans.length > 0 ? (
          filteredScans.map((scan) => (
            <motion.button
              key={scan.id}
              variants={isGlossyMotion ? fadeInUp : {}}
              whileHover={{ x: 4 }}
              onClick={() => onSelect?.(scan)}
              className="w-full flex items-center justify-between text-xs py-3 px-2 border-b border-[var(--border)]/30 last:border-b-0 hover:bg-[var(--bg-base)] rounded-xl transition-colors text-left min-h-[44px]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${scan.direction === 'IN' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[var(--action-danger)]/10 text-[var(--action-danger)]'}`}>
                  <User className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[var(--text-primary)] truncate">{scan.name}</p>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">{scan.roll}</p>
                  {scan.operatorName ? (
                    <p className="text-[10px] text-[var(--text-secondary)] inline-flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> by {scan.operatorName}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <div className={`flex items-center gap-1 text-[11px] font-bold ${scan.direction === 'IN' ? 'text-emerald-400' : 'text-[var(--action-danger)]'}`}>
                    {scan.direction === 'IN' ? (
                      <>
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>ENTRY</span>
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>EXIT</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {new Date(scan.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
              </div>
            </motion.button>
          ))
        ) : (
          <div className="text-center py-6 text-[var(--text-muted)] text-xs">
            No gate scans registered for filter "{filter}".
          </div>
        )}
      </motion.div>
    </div>
  );
}
