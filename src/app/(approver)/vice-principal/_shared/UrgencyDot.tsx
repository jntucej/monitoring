import { cn } from "@/lib/utils";

export interface UrgencyDotProps {
  urgency?: "critical" | "high" | "medium" | "low" | "warn" | "danger" | "info" | "neutral";
  className?: string;
}

export function UrgencyDot({ urgency = "neutral", className }: UrgencyDotProps) {
  const dotClasses: Record<string, string> = {
    critical: "bg-[var(--action-danger)]",
    danger: "bg-[var(--action-danger)]",
    high: "bg-[var(--action-warning)]",
    warn: "bg-[var(--action-warning)]",
    medium: "bg-[var(--action-info,#3b82f6)]",
    info: "bg-[var(--action-info,#3b82f6)]",
    low: "bg-[var(--action-primary)]",
    neutral: "bg-[var(--text-muted)]",
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
