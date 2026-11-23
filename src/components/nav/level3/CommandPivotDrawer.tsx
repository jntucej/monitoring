"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { X, ArrowUpRight, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommandPivotTarget {
  kind: "student" | "faculty" | "gate" | "ticket";
  id: string;
  title: string;
  subtitle?: string;
  fullRoute: string;
  relatedLinks: Array<{ label: string; href: string }>;
}

const KIND_LABEL: Record<CommandPivotTarget["kind"], string> = {
  student: "Student",
  faculty: "Faculty",
  gate: "Gate",
  ticket: "Ticket",
};

export function CommandPivotDrawer({
  target,
  onClose,
}: {
  target: CommandPivotTarget | null;
  onClose: () => void;
}) {
  // Lock body scroll when open
  useEffect(() => {
    if (!target) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [target]);

  const handleEsc = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  if (!target) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={`${KIND_LABEL[target.kind]} ${target.id} command pivot`}
      onKeyDown={handleEsc}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        className={cn(
          "absolute right-0 top-0 h-full w-full max-w-sm sm:max-w-md",
          "bg-bg-surface border-l border-border shadow-2xl",
          "flex flex-col",
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 shrink-0 text-action-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                {KIND_LABEL[target.kind]} · {target.id}
              </span>
            </div>
            <h2 className="mt-1 text-base font-bold text-text-primary truncate">
              {target.title}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href={target.fullRoute}
              className="surface-card inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-action-primary hover:bg-bg-elevated transition-colors"
              onClick={onClose}
            >
              Full View
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="surface-card p-1.5 text-text-muted hover:text-text-primary transition-colors"
              aria-label="Close pivot drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {target.subtitle && (
            <div className="surface-card bg-bg-elevated px-3 py-2 text-xs text-text-secondary">
              {target.subtitle}
            </div>
          )}

          {target.relatedLinks.length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Operational Surfaces
              </p>
              <div className="grid grid-cols-2 gap-2">
                {target.relatedLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "surface-card bg-bg-surface border border-border",
                      "px-3 py-2.5 text-left",
                      "hover:border-action-primary/40 hover:bg-bg-elevated transition-colors",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-primary truncate">
                        {link.label}
                      </span>
                      <ArrowUpRight className="w-3 h-3 shrink-0 text-text-muted" />
                    </div>
                    <span className="mt-0.5 block text-[10px] text-text-muted truncate">
                      {link.href}
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
