/**
 * shared/LockedByPolicy.tsx — the 🔒 "Set by institute" indicator.
 *
 * Rendered next to any preference control whose rank is "required" and is
 * in effect. The user's value is stored (audit) but not applied. This makes
 * the safety rail VISIBLE: a student who tries to silence a curfew alert sees
 * the lock, not a silent no-op.
 */

"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LockedByPolicyProps {
  /** The reason (shown in the tooltip / sub-label). */
  reason?: string;
  className?: string;
  /** Render as a compact inline chip instead of a banner. */
  compact?: boolean;
}

export function LockedByPolicy({
  reason = "Set by institute",
  className,
  compact = false,
}: LockedByPolicyProps) {
  if (compact) {
    return (
      <span
        title={reason}
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-bg-elevated border border-border px-1.5 py-0.5 text-[10px] font-medium text-text-muted",
          className,
        )}
      >
        <Lock className="h-2.5 w-2.5" />
        {reason}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs text-text-muted",
        className,
      )}
    >
      <Lock className="h-3.5 w-3.5 shrink-0 text-text-muted" />
      <span>{reason}</span>
      <span className="ml-auto text-[10px] text-text-muted/70">cannot be overridden</span>
    </div>
  );
}

export default LockedByPolicy;
