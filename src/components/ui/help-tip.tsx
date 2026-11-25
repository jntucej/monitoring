"use client";

import { useEffect, useId, useRef, useState } from "react";
import { HelpCircle, Info } from "lucide-react";

export interface HelpTipProps {
  /** Short explanation shown in the popover/tooltip */
  text: string;
  /** Optional accessible label for the trigger button */
  label?: string;
  /** Icon variant: 'help' (?) or 'info' (i) */
  variant?: "help" | "info";
  /** Alignment relative to trigger */
  align?: "left" | "right" | "center";
  className?: string;
}

/**
 * HelpTip — compact, keyboard- and touch-accessible contextual help trigger.
 * Opens on click/tap (mobile-friendly) or focus/hover, closes on Escape or outside click.
 */
export function HelpTip({
  text,
  label = "More information",
  variant = "help",
  align = "center",
  className = "",
}: HelpTipProps) {
  const [open, setOpen] = useState(false);
  const tipId = useId();
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const Icon = variant === "info" ? Info : HelpCircle;
  const alignClass =
    align === "left"
      ? "left-0"
      : align === "right"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex items-center justify-center rounded-full p-0.5 text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className={`absolute bottom-full mb-1.5 z-50 w-60 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-bg-surface px-2.5 py-2 text-[11px] leading-relaxed font-normal text-text-secondary shadow-md ${alignClass}`}
        >
          {text}
        </span>
      )}
    </span>
  );
}

export default HelpTip;
