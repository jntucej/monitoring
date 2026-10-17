"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * SectionCard — a titled card used for settings / form sections in the admin
 * console. Pair it with <WidgetBoundary title="…"> (the error boundary) and
 * pass the same title so a section that throws still shows a labeled fallback.
 */
export interface SectionCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconTone?: "default" | "accent";
  className?: string;
  children: React.ReactNode;
  /** Renders a slim inner header band. Default true. */
  showHeader?: boolean;
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  iconTone = "accent",
  className,
  children,
  showHeader = true,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-lg",
        className
      )}
    >
      {showHeader && (
        <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4 mb-5">
          {Icon && (
            <div
              className={cn(
                "p-2 rounded-xl shrink-0",
                iconTone === "accent"
                  ? "bg-[var(--action-primary)]/10 text-[var(--action-primary)]"
                  : "bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
              )}
            >
              <Icon className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-[var(--text-muted)] truncate">{description}</p>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

export default SectionCard;
