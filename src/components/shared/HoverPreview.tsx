"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * HoverPreview — the "hover → tooltip/preview" layer of the inspection
 * hierarchy. Wraps any element and, on hover (or focus, for keyboard),
 * shows a compact preview card without leaving the page.
 *
 * Usage:
 *
 *   <HoverPreview preview={<StudentQuickCard row={r} />}>
 *     <button>…row content…</button>
 *   </HoverPreview>
 *
 * The preview is intentionally compact (a few key facts + state) — the
 * full context/history/actions live in `EntityInspector` (click → panel).
 */

export interface HoverPreviewProps {
  /** The compact preview shown on hover. */
  preview: ReactNode;
  /** The element to wrap. */
  children: ReactNode;
  /** Position of the preview relative to the trigger. Default "top". */
  position?: "top" | "bottom" | "left" | "right";
  /** Extra ms before the preview shows (debounce so it doesn't flicker). */
  delayMs?: number;
  /** Render the trigger inline (no extra wrapper). Default true. */
  inline?: boolean;
  /** Class for the preview card. */
  previewClassName?: string;
}

const POSITIONS: Record<
  NonNullable<HoverPreviewProps["position"]>,
  { trigger: string; card: string }
> = {
  top: {
    trigger: "relative group",
    card: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  },
  bottom: {
    trigger: "relative group",
    card: "top-full left-1/2 -translate-x-1/2 mt-2",
  },
  left: {
    trigger: "relative group",
    card: "top-1/2 right-full -translate-y-1/2 mr-2",
  },
  right: {
    trigger: "relative group",
    card: "top-1/2 left-full -translate-y-1/2 ml-2",
  },
};

export function HoverPreview({
  preview,
  children,
  position = "top",
  delayMs = 150,
  inline = true,
  previewClassName,
}: HoverPreviewProps) {
  const [open, setOpen] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const openSoon = () => {
    if (timer) clearTimeout(timer);
    setTimer(setTimeout(() => setOpen(true), delayMs));
  };
  const closeSoon = () => {
    if (timer) clearTimeout(timer);
    setTimer(null);
    setOpen(false);
  };

  const pos = POSITIONS[position];

  const wrapper = (
    <span
      className={cn(pos.trigger, "inline-flex max-w-full", !inline && "block w-full")}
      onMouseEnter={openSoon}
      onMouseLeave={closeSoon}
      onFocus={openSoon}
      onBlur={closeSoon}
      tabIndex={-1}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            "absolute z-[70] surface-card bg-bg-surface p-3 text-xs text-text-primary shadow-lg border border-border max-w-64 w-max",
            pos.card,
            previewClassName,
          )}
        >
          {preview}
        </span>
      )}
    </span>
  );

  return wrapper;
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
