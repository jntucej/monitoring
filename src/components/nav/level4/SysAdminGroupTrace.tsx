"use client";
// src/components/nav/level4/SysAdminGroupTrace.tsx
// Level-4 group-diagnostic strip: a compact dashed-border bar that groups
// several trace routes for one sysadmin data page (e.g. "system & audit
// traces"). Left = Activity icon + groupLabel (mono); right = a wrapping row
// of small mono-styled Link tiles. Purely presentational.

import Link from "next/link";
import { Activity } from "lucide-react";

export function SysAdminGroupTrace({
  groupLabel,
  links,
}: {
  groupLabel: string;
  links: Array<{ label: string; href: string }>;
}) {
  if (links.length === 0) return null;

  return (
    <div className="border border-dashed border-border rounded-md bg-bg-elevated/30 px-3 py-2 flex items-center gap-3 flex-wrap">
      {/* Left: label */}
      <div className="flex items-center gap-2 shrink-0">
        <Activity className="w-3.5 h-3.5 text-action-primary" />
        <span className="font-mono text-[11px] text-text-secondary uppercase tracking-wider">
          {groupLabel}
        </span>
      </div>

      {/* Right: wrapping link tiles */}
      <div className="flex flex-wrap gap-1.5">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="font-mono text-[11px] px-2 py-0.5 rounded bg-bg-surface border border-border/60 text-text-muted hover:text-text-primary hover:border-border transition-colors"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
