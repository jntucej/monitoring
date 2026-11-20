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
  watch: "ring-2 ring-amber-400",
  probation: "ring-2 ring-orange-500",
  suspended: "ring-2 ring-rose-500",
  banned: "ring-2 ring-zinc-900",
};

const PILL_STYLES: Record<FlagLevel, string> = {
  clear: "bg-bg-elevated text-text-muted border-border",
  watch: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  probation: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  suspended: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  banned: "bg-zinc-900/10 text-zinc-700 border-zinc-900/20",
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
