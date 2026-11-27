"use client";

import * as React from "react";
import { Chip } from "@heroui/react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "entry"
  | "exit"
  | "dayout"
  | "leave"
  | "offline"
  | "success"
  | "error";

const badgeColors: Record<BadgeVariant, string> = {
  entry: "bg-action-primary/10 text-action-primary",
  exit: "bg-action-danger/10 text-action-danger",
  dayout: "bg-action-warning/10 text-action-warning",
  leave: "bg-action-info/10 text-action-info",
  offline: "bg-action-warning/10 text-action-warning",
  success: "bg-action-primary/10 text-action-primary",
  error: "bg-action-danger/10 text-action-danger",
};

const dotColors: Record<BadgeVariant, string> = {
  entry: "var(--action-primary)",
  exit: "var(--action-danger)",
  dayout: "var(--action-warning)",
  leave: "var(--action-info)",
  offline: "var(--action-warning)",
  success: "var(--action-primary)",
  error: "var(--action-danger)",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "entry", dot = true, children, ...props }, ref) => {
    return (
      <Chip
        ref={ref}
        size="sm"
        variant="soft"
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
          badgeColors[variant],
          className
        )}
        {...(props as Record<string, unknown>)}
      >
        {dot && (
          <span
            className="size-2 rounded-full shrink-0"
            style={{ backgroundColor: dotColors[variant] }}
            aria-hidden="true"
          />
        )}
        <Chip.Label>{children}</Chip.Label>
      </Chip>
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
