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
  sm: "size-2",
  md: "w-2 h-2",
  lg: "size-2",
};

export function StatusBadge({ direction, reason, className, size = "md" }: StatusBadgeProps) {
  const isGlossyMotion = useGlossyMotion();
  const isEntry = direction === "IN";

  const bgColor = isEntry
    ? "bg-action-primary/10"
    : reason === "Day Out"
    ? "bg-action-warning/10"
    : reason === "Leave"
    ? "bg-action-info/10"
    : "bg-action-danger/10";

  const textColor = isEntry
    ? "text-action-primary"
    : reason === "Day Out"
    ? "text-action-warning"
    : reason === "Leave"
    ? "text-action-info"
    : "text-action-danger";

  const dotColor = isEntry
    ? "bg-action-primary"
    : reason === "Day Out"
    ? "bg-action-warning"
    : reason === "Leave"
    ? "bg-action-info"
    : "bg-action-danger";

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
