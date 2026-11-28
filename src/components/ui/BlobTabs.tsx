"use client";

import React, { useState } from "react";

export interface BlobTabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * BlobTabs — a sliding-pill tab bar. The caller owns the active value + the
 * URL sync (via `onChange`), so bookmarking / back-button work. Renders a
 * rounded "blob" indicator that slides to the active tab.
 *
 * GPU-safe: the indicator animates only `transform` (no layout thrash).
 * Respects reduced-motion by disabling the slide transition.
 */
export function BlobTabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel = "Tabs",
  className = "",
}: {
  items: BlobTabItem<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string;
  className?: string;
}) {
  // Track reduced-motion so the slide animation degrades gracefully.
  // Lazy-initialize from matchMedia (no effect for the first paint); the
  // effect only subscribes to live changes — an external-system sync.
  const [reduced, setReduced] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const activeIdx = Math.max(
    0,
    items.findIndex((i) => i.id === value),
  );

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      data-testid="blob-tabs"
      className={`relative flex flex-wrap gap-1 rounded-2xl bg-bg-elevated/60 border border-border p-1 ${className}`}
    >
      {/* Sliding pill indicator (GPU transform only). */}
      <span
        aria-hidden="true"
        className="absolute top-1 bottom-1 rounded-xl bg-action-primary transition-transform duration-200 ease-out"
        style={{
          left: 4,
          width: `calc((100% - 8px) / ${items.length})`,
          transform: `translateX(${activeIdx * 100}%)`,
          transition: reduced ? "none" : undefined,
        }}
      />
      {items.map((item, idx) => {
        const active = idx === activeIdx;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={`blob-tab-${item.id}`}
            onClick={() => onChange(item.id)}
            className={`relative z-10 flex-1 min-w-[72px] flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-semibold transition-colors ${
              active ? "text-white" : "text-text-muted hover:text-text-primary"
            }`}
          >
            {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
