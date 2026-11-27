"use client";

import { HelpCircle, Info } from "lucide-react";
import { Tooltip as HeroTooltip } from "@heroui/react";
import { cn } from "@/lib/utils";

export interface HelpTipProps {
  /** Short explanation shown in the tooltip */
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
 * HelpTip — compact, keyboard- AND touch-accessible contextual help trigger.
 * Backed by HeroUI v3 `Tooltip` (React Aria): opens on hover, focus, or tap;
 * auto-flips to stay in the viewport on narrow screens; closes on Escape or
 * outside click. The old hand-rolled hover-only popover is gone.
 */
export function HelpTip({
  text,
  label = "More information",
  variant = "help",
  align = "center",
  className = "",
}: HelpTipProps) {
  const Icon = variant === "info" ? Info : HelpCircle;

  return (
    <span className={cn("inline-flex items-center align-middle", className)}>
      <HeroTooltip.Root>
        <HeroTooltip.Trigger>
          <button
            type="button"
            aria-label={label}
            className="inline-flex items-center justify-center rounded-full p-0.5 text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </HeroTooltip.Trigger>
        <HeroTooltip.Content
          className={cn(
            "z-50 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-bg-surface px-2.5 py-2 text-[11px] font-normal leading-relaxed text-text-secondary shadow-md",
            className,
          )}
        >
          {text}
        </HeroTooltip.Content>
      </HeroTooltip.Root>
    </span>
  );
}

export default HelpTip;
