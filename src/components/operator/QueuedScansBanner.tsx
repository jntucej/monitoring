"use client";

import { Hourglass, Play, X } from "lucide-react";

interface QueuedScansBannerProps {
  queuedCount: number;
  replaying: boolean;
  onReplay: () => void;
  onClear: () => void;
}

export function QueuedScansBanner({ queuedCount, replaying, onReplay, onClear }: QueuedScansBannerProps) {
  if (queuedCount === 0 && !replaying) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-2.5 shadow-sm animate-in fade-in slide-in-from-top duration-200">
      <div className="flex items-center gap-2 min-w-0">
        <Hourglass className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-xs font-semibold text-amber-300 truncate">
          {replaying
            ? `Syncing ${queuedCount} queued scan${queuedCount === 1 ? "" : "s"}…`
            : `${queuedCount} scan${queuedCount === 1 ? "" : "s"} queued offline — will sync automatically`}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onReplay}
          disabled={replaying || queuedCount === 0}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-bold hover:bg-amber-400 disabled:opacity-40 transition-colors"
        >
          <Play className="w-3 h-3" /> Replay Now
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={replaying}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-bold hover:bg-rose-500/25 disabled:opacity-40 transition-colors"
        >
          <X className="w-3 h-3" /> Clear
        </button>
      </div>
    </div>
  );
}
