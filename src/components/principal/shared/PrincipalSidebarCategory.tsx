"use client";

/* ── PrincipalSidebarCategory ── */

import { ChevronDown, ChevronRight } from "lucide-react";
import { memo, useState } from "react";

export interface SidebarCategoryProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const PrincipalSidebarCategory = memo(function PrincipalSidebarCategory({
  title, icon, children, defaultOpen = false,
}: SidebarCategoryProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="flex-1 text-left">{title}</span>
        {open
          ? <ChevronDown className="h-3 w-3" />
          : <ChevronRight className="h-3 w-3" />
        }
      </button>
      {open && (
        <div className="mt-1 ml-3 space-y-0.5 border-l border-[var(--border)] pl-3">
          {children}
        </div>
      )}
    </div>
  );
});
