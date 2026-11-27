"use client";

import { useState, type ReactNode } from "react";
import { Popover } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * HoverPreview — the "hover → tooltip/preview" layer of the inspection
 * hierarchy. Backed by HeroUI v3 Popover (React Aria): opens on hover,
 * focus, or tap; auto-flips off viewport edges; closes on outside press
 * or Escape.
 *
 * Usage:
 *   <HoverPreview preview={<StudentQuickCard row={r} />}>
 *     <button>…row content…</button>
 *   </HoverPreview>
 */

export interface HoverPreviewProps {
  /** The compact preview shown on hover / tap. */
  preview: ReactNode;
  /** The element to wrap. */
  children: ReactNode;
  /** Position of the preview relative to the trigger. Default "top". */
  position?: "top" | "bottom" | "left" | "right";
  /** Extra ms before the preview shows on hover (debounce so it doesn't flicker). */
  delayMs?: number;
  /** Render the trigger inline (no extra wrapper). Default true. */
  inline?: boolean;
  /** Class for the preview card. */
  previewClassName?: string;
}

export function HoverPreview({
  preview,
  children,
  position = "top",
  delayMs = 150,
  inline = true,
  previewClassName,
}: HoverPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timer) clearTimeout(timer);
    setTimer(setTimeout(() => setIsOpen(true), delayMs));
  };

  const handleMouseLeave = () => {
    if (timer) clearTimeout(timer);
    setTimer(null);
    setIsOpen(false);
  };

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger
        className={cn(
          inline ? "inline-flex max-w-full" : "block w-full",
          "cursor-pointer text-left focus:outline-none"
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </Popover.Trigger>
      <Popover.Content
        placement={position}
        className={cn(
          "z-[70] surface-card bg-bg-surface p-3 text-xs text-text-primary shadow-lg border border-border max-w-64 w-max",
          previewClassName
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Popover.Dialog className="outline-none">
          {preview}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

/**
 * A ready-made compact preview for a "current status" style metric.
 *
 *   <HoverPreview preview={<MetricPreview label="On campus" value={n} hint="checked-in and not yet checked-out" />}>
 */
export function MetricPreview({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <span className="block space-y-0.5">
      <span className="font-semibold text-text-muted uppercase tracking-wide text-[10px]">{label}</span>
      <span className="text-sm font-bold text-text-primary tabular-nums">{value}</span>
      {hint ? <span className="block text-text-muted text-[11px]">{hint}</span> : null}
    </span>
  );
}
