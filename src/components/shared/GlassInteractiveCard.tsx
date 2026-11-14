"use client";
import { cn } from "@/lib/utils";

export interface GlassInteractiveCardProps {
  children: React.ReactNode;
  className?: string;
  status?: "entry" | "exit" | "idle";
  isDark?: boolean;
}

export function GlassInteractiveCard({
  children, className, status = "idle",
}: GlassInteractiveCardProps) {
  return (
    <div className={cn(
      "glass-card p-[var(--spacing-card)]",
      status === "entry" && "border-l-4 border-l-[var(--color-action-success)]",
      status === "exit"  && "border-l-4 border-l-[var(--color-action-danger)]",
      className,
    )}>{children}</div>
  );
}

export default GlassInteractiveCard;
