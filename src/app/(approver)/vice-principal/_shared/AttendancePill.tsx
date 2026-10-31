import { cn } from "@/lib/utils";

export interface AttendancePillProps {
  pct: number;
  className?: string;
}

export function AttendancePill({ pct, className }: AttendancePillProps) {
  const tone =
    pct >= 85
      ? "bg-[var(--action-primary)]/10 text-[var(--action-primary)]"
      : pct >= 75
        ? "bg-[var(--action-warning)]/10 text-[var(--action-warning)]"
        : "bg-[var(--action-danger)]/10 text-[var(--action-danger)]";

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
