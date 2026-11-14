import { cn } from "@/lib/utils";

export interface UrgencyDotProps {
  urgency?: "critical" | "high" | "medium" | "low" | "warn" | "danger" | "info" | "neutral";
  className?: string;
}

export function UrgencyDot({ urgency = "neutral", className }: UrgencyDotProps) {
  const dotClasses: Record<string, string> = {
    critical: "bg-action-danger",
    danger: "bg-action-danger",
    high: "bg-action-warning",
    warn: "bg-action-warning",
    medium: "bg-[var(--action-info,var(--action-primary))]",
    info: "bg-[var(--action-info,var(--action-primary))]",
    low: "bg-action-primary",
    neutral: "bgtext-muted",
  };

  return (
    <span
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        dotClasses[urgency] ?? dotClasses.neutral,
        className
      )}
      aria-hidden="true"
    />
  );
}
