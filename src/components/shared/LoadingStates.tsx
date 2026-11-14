"use client";

import React from "react";

export function PageLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="p-4 space-y-4 animate-pulse">
      <div className="h-8 bg-bg-elevated/50 rounded-xl w-1/3" />
      <div className="h-4 bg-bg-elevated/40 rounded-lg w-full" />
      <div className="h-4 bg-bg-elevated/40 rounded-lg w-5/6" />
      <div className="h-4 bg-bg-elevated/40 rounded-lg w-2/3" />
      <span className="sr-only">Loading page...</span>
    </div>
  );
}

export function WidgetLoading() {
  return (
    <div className="surface-card bg-bg-surface animate-pulse p-4 space-y-3">
      <div className="h-4 w-1/4 bg-bg-elevated rounded" />
      <div className="h-4 w-1/2 bg-bg-elevated rounded" />
      <div className="h-20 bg-bg-elevated rounded" />
    </div>
  );
}

export function TableLoading(rows = 5) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-bg-surface">
      <table className="w-full text-sm min-w-full">
        <thead>
          <tr className="border-b border-border text-left text-text-muted">
            <th className="p-4 font-medium">Column 1</th>
            <th className="p-4 font-medium">Column 2</th>
            <th className="p-4 font-medium">Column 3</th>
            <th className="p-4 font-medium">Column 4</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {[...Array(rows)].map((_, i) => (
            <tr key={i} className="animate-pulse">
              <td className="p-4"><div className="h-4 w-24 bg-bg-elevated rounded" /></td>
              <td className="p-4"><div className="h-4 w-20 bg-bg-elevated rounded" /></td>
              <td className="p-4"><div className="h-4 w-16 bg-bg-elevated rounded" /></td>
              <td className="p-4"><div className="h-4 w-24 bg-bg-elevated rounded" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-bg-elevated/40 rounded-xl w-full" />
      ))}
      <span className="sr-only">Loading table data...</span>
    </div>
  );
}

export function CardSkeleton({ height = "h-32" }: { height?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={`bg-bg-elevated/40 rounded-2xl ${height} w-full animate-pulse flex items-center justify-center`}>
      <span className="sr-only">Loading content...</span>
    </div>
  );
}

export function LoadingStates() {
  return (
    <div className="flex items-center justify-center p-8 text-text-muted text-sm">
      Loading…
    </div>
  );
}
