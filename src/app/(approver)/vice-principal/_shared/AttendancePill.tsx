import { cn } from "@/lib/utils";

export interface AttendancePillProps {
  pct: number;
  className?: string;
}

export function AttendancePill({ pct, className }: AttendancePillProps) {
  const tone =
    pct >= 85
      ? "bg-action-primary/10 text-action-primary"
      : pct >= 75
        ? "bg-action-warning/10 text-action-warning"
        : "bg-action-danger/10 text-action-danger";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums",
        tone,
        className
      )}
    >
      {pct}%
    </span>
  );
}
