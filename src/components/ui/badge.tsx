"use client";

import * as React from "react";
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

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "entry", dot = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
          badgeColors[variant],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className="size-2 rounded-full"
            style={{
              backgroundColor:
                variant === "entry"
                  ? "var(--action-primary)"
                  : variant === "exit"
                  ? "var(--action-danger)"
                  : variant === "dayout"
                  ? "var(--action-warning)"
                  : variant === "leave"
                  ? "var(--action-info)"
                  : variant === "offline"
                  ? "var(--action-warning)"
                  : variant === "success"
                  ? "var(--action-primary)"
                  : "var(--action-danger)",
            }}
          />
        )}
        {children}
      </div>
    );
  }
);
Badge.displayName = "Badge";

export { Badge };