"use client";

import { cn } from "@/lib/utils";

interface ModePillProps {
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick: () => void;
}

export function ModePill({ label, shortcut, active = false, onClick }: ModePillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-[11px] font-bold tracking-wide transition-colors border",
        active
          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
          : "bg-white/5 text-slate-400 border-white/10 hover:text-slate-200"
      )}
    >
      {label}
      {shortcut && (
        <span className="ml-1.5 text-[9px] font-semibold opacity-60">{shortcut}</span>
      )}
    </button>
  );
}
