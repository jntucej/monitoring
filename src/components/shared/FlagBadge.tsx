/**
 * shared/FlagBadge — colored ring + tooltip for a user's conduct flag.
 *
 * Ring color:
 *   clear      → no ring (transparent)
 *   watch      → amber ring
 *   probation  → orange ring
 *   suspended  → red ring
 *   banned     → black ring
 *
 * Tooltip shows the flag reason (e.g. "watch: late_return ×1 in 30d").
 */

"use client";

import { cn } from "@/lib/utils";
import type { FlagLevel } from "@/lib/permission-model";

export interface FlagBadgeProps {
  flag: FlagLevel;
  /** Tooltip text. If omitted, a default per-flag tooltip is shown. */
  reason?: string;
  /** Render as a ring around content (wrap mode) or as a standalone pill. */
  variant?: "ring" | "pill";
  className?: string;
  children?: React.ReactNode;
}

const RING_STYLES: Record<FlagLevel, string> = {
  clear: "ring-0",
  watch: "ring-2 ring-action-warning",
  probation: "ring-2 ring-action-warning",
  suspended: "ring-2 ring-action-danger",
  banned: "ring-2 ring-action-primary",
};

const PILL_STYLES: Record<FlagLevel, string> = {
  clear: "bg-bg-elevated text-text-muted border-border",
  watch: "bg-action-warning/10 text-action-warning border-action-warning/20",
  probation: "bg-action-warning/10 text-action-warning border-action-warning/20",
  suspended: "bg-action-danger/10 text-action-danger border-action-danger/20",
  banned: "bg-action-primary/10 text-action-primary border-action-primary/20",
};

const DEFAULT_TIPS: Record<FlagLevel, string> = {
  clear: "No active flag",
  watch: "Under watch — actions require step-up",
  probation: "On probation — dual approval required",
  suspended: "Suspended — cannot act on tickets",
  banned: "Banned — fully blocked",
};

export function FlagBadge({
  flag,
  reason,
  variant = "pill",
  className,
  children,
}: FlagBadgeProps) {
  const tip = reason ?? DEFAULT_TIPS[flag];

  // "clear" → no visual indicator (return children only)
  if (flag === "clear") {
    return <>{children}</>;
  }

  if (variant === "ring") {
    return (
      <div
        title={tip}
        className={cn(
          "rounded-full inline-flex items-center justify-center",
          RING_STYLES[flag],
          className
        )}
      >
        {children ?? (
          <span className="text-[10px] font-semibold uppercase">{flag}</span>
        )}
      </div>
    );
  }

  // pill variant
  return (
    <span
      title={tip}
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        PILL_STYLES[flag],
        className
      )}
    >
      {flag}
    </span>
  );
}

export default FlagBadge;
