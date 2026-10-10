"use client";

import React from "react";

export function PageLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="p-4 space-y-4 animate-pulse">
      <div className="h-8 bg-slate-800/50 rounded-xl w-1/3" />
      <div className="h-4 bg-slate-800/40 rounded-lg w-full" />
      <div className="h-4 bg-slate-800/40 rounded-lg w-5/6" />
      <div className="h-4 bg-slate-800/40 rounded-lg w-2/3" />
      <span className="sr-only">Loading page...</span>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-slate-800/40 rounded-xl w-full" />
      ))}
      <span className="sr-only">Loading table data...</span>
    </div>
  );
}

export function CardSkeleton({ height = "h-32" }: { height?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={`bg-slate-800/40 rounded-2xl ${height} w-full animate-pulse flex items-center justify-center`}>
      <span className="sr-only">Loading content...</span>
    </div>
  );
}
