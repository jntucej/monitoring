"use client";

import React from "react";

export function renderPart2(type: string, data: any) {
  switch (type) {
    case "decision-tree":
      return (
        <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] space-y-2 text-center">
          <div className="inline-block px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold">
            ROOT: {data.root}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10.5px] text-emerald-300 font-semibold">
              YES → {typeof data.left === "object" ? data.left.root : data.left}
            </div>
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[10.5px] text-rose-300 font-semibold">
              NO → {typeof data.right === "object" ? data.right.root : data.right}
            </div>
          </div>
        </div>
      );

    case "svm":
      return (
        <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-1">
            <span>● Class A</span>
            <span className="text-[var(--action-primary)]">MARGIN (2 / ||w||)</span>
            <span>▲ Class B</span>
          </div>
          <div className="p-2 rounded-lg bg-[var(--bg-surface)] text-center text-[10.5px] text-[var(--text-secondary)]">
            Hyperplane (WᵀX + b = 0) separates classes. <strong className="text-amber-400">Support Vectors</strong> anchor margin.
          </div>
        </div>
      );

    case "rf":
      return (
        <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] space-y-2 text-center">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {["Tree 1", "Tree 2", "Tree 3", "Tree N"].map((tree, idx) => (
              <div key={idx} className="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                🌲 {tree}
              </div>
            ))}
          </div>
          <div className="text-[10.5px] text-[var(--text-secondary)]">
            Bagging + Random Features → Majority Voting → Final Class
          </div>
        </div>
      );

    case "dbscan":
      return (
        <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] space-y-2">
          <div className="grid grid-cols-3 gap-1 text-center text-[10.5px]">
            <div className="p-1.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">● Core (≥ MinPts)</div>
            <div className="p-1.5 rounded bg-sky-500/20 text-sky-300 font-bold">○ Border (in ε)</div>
            <div className="p-1.5 rounded bg-rose-500/20 text-rose-300 font-bold">× Noise (Outlier)</div>
          </div>
        </div>
      );

    case "dendrogram":
      return (
        <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-center space-y-2">
          <div className="text-[11px] font-bold text-[var(--action-primary)]">DENDROGRAM HIERARCHY</div>
          <div className="flex justify-around text-[10px] text-[var(--text-secondary)] font-mono">
            <span>[A, B]</span>
            <span>━━━━ Merge ━━━━</span>
            <span>[C, D]</span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] italic">Cut horizontal line at height H to select cluster count K</div>
        </div>
      );

    case "graph":
      return (
        <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-center space-y-1">
          <div className="font-mono text-xs font-bold text-[var(--action-primary)]">
            {data.equation}
          </div>
          {data.label && <div className="text-[10.5px] text-[var(--text-muted)]">{data.label}</div>}
        </div>
      );

    case "comparison":
      if (!data || !Array.isArray(data)) return null;
      return (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="grid grid-cols-3 bg-[var(--bg-elevated)] text-[10px] font-bold text-[var(--text-muted)] border-b border-[var(--border)]">
            <div className="p-2 text-center">Feature</div>
            <div className="p-2 text-center border-l border-[var(--border)]">A</div>
            <div className="p-2 text-center border-l border-[var(--border)]">B</div>
          </div>
          {data.map((row: any, idx: number) => (
            <div key={idx} className={`grid grid-cols-3 text-[10.5px] border-b border-[var(--border)] last:border-0 ${idx % 2 === 0 ? "bg-[var(--bg-surface)]/40" : ""}`}>
              <div className="p-2 font-medium text-[var(--text-primary)]">{row.feature}</div>
              <div className="p-2 text-[var(--text-secondary)] border-l border-[var(--border)]">{row.valA}</div>
              <div className="p-2 text-[var(--text-secondary)] border-l border-[var(--border)]">{row.valB}</div>
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
}
