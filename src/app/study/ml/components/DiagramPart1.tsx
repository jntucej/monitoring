"use client";

import React from "react";
import { ChevronRight, ArrowDown } from "lucide-react";

export function renderPart1(type: string, data: any) {
  switch (type) {
    case "pipeline":
      return (
        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-1.5 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
          {(Array.isArray(data) ? data : []).map((step: string, idx: number) => (
            <React.Fragment key={idx}>
              <div className="px-2.5 py-1 rounded-lg bg-[var(--action-primary)]/10 border border-[var(--action-primary)]/20 text-[11px] font-bold text-[var(--action-primary)] text-center shadow-xs">
                {step}
              </div>
              {idx < (data.length || 0) - 1 && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] hidden sm:block" />
                  <ArrowDown className="w-3.5 h-3.5 text-[var(--text-muted)] sm:hidden" />
                </>
              )}
            </React.Fragment>
          ))}
        </div>
      );

    case "flow":
      return (
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
          {(Array.isArray(data) ? data : []).map((step: string, idx: number) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[var(--action-primary)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[11px] font-medium text-[var(--text-primary)]">
                {step}
              </div>
            </div>
          ))}
        </div>
      );

    case "tree":
      return (
        <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] space-y-3">
          <div className="text-center">
            <span className="px-3 py-1 rounded-lg bg-[var(--action-primary)] text-white text-[11px] font-bold shadow-xs">
              {data.root}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(data.branches || []).map((b: any, idx: number) => (
              <div key={idx} className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
                <span className="text-[11px] font-bold text-[var(--action-primary)] block border-b border-[var(--border)] pb-1">
                  {b.name}
                </span>
                <div className="space-y-0.5 pt-1">
                  {(b.sub || []).map((s: string, sIdx: number) => (
                    <div key={sIdx} className="text-[10.5px] text-[var(--text-secondary)] flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "sigmoid":
      return (
        <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--action-primary)] font-bold border-b border-[var(--border)] pb-1.5">
            <span>Sigmoid σ(z) = 1 / (1 + e⁻ᶻ)</span>
            <span>Range: (0, 1)</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-[10.5px] text-[var(--text-secondary)] pt-1">
            <span>z &lt; 0 → P &lt; 0.5 (Class 0)</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">z = 0 → P = 0.5 Threshold</span>
            <span>z &gt; 0 → P &gt; 0.5 (Class 1)</span>
          </div>
        </div>
      );

    default:
      return null;
  }
}
