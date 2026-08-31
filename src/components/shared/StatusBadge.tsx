"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ScanDirection, ExitReason } from "@/lib/types";
import { useGlossyMotion, statusPulse } from "@/lib/animations";

interface StatusBadgeProps {
  direction: ScanDirection;
  reason?: ExitReason;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-xs",
  lg: "px-3 py-1 text-sm",
};

const dotSizes = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-2.5 h-2.5",
};

export function StatusBadge({ direction, reason, className, size = "md" }: StatusBadgeProps) {
  const isGlossyMotion = useGlossyMotion();
  const isEntry = direction === "IN";

  const bgColor = isEntry
    ? "bg-[var(--action-primary)]/10"
    : reason === "Day Out"
    ? "bg-[var(--action-warning)]/10"
    : reason === "Leave"
    ? "bg-[var(--action-info)]/10"
    : "bg-[var(--action-danger)]/10";

  const textColor = isEntry
    ? "text-[var(--action-primary)]"
    : reason === "Day Out"
    ? "text-[var(--action-warning)]"
    : reason === "Leave"
    ? "text-[var(--action-info)]"
    : "text-[var(--action-danger)]";

  const dotColor = isEntry
    ? "bg-[var(--action-primary)]"
    : reason === "Day Out"
    ? "bg-[var(--action-warning)]"
    : reason === "Leave"
    ? "bg-[var(--action-info)]"
    : "bg-[var(--action-danger)]";

  const icon = isEntry ? "⬇" : reason === "Home Out" ? "🏠" : reason === "Day Out" ? "☀️" : reason === "Leave" ? "📝" : "🚶";
  const label = isEntry ? "ENTRY" : reason ? reason.toUpperCase() : "EXIT";

  return (
    <motion.span
      animate={isGlossyMotion && isEntry ? statusPulse : {}}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        sizeClasses[size],
        bgColor,
        textColor,
        className
      )}
    >
      <span className={cn("rounded-full", dotSizes[size], dotColor, isEntry && "animate-pulse")} />
      <span className="leading-tight">{icon}</span>
      <span className="leading-tight sm:hidden">{icon}</span>
      <span className="leading-tight hidden sm:inline">{label}</span>
    </motion.span>
  );
}
