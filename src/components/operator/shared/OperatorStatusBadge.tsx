"use client";

// src/components/operator/shared/OperatorStatusBadge.tsx
// Operator-specific copy of @/components/shared/StatusBadge

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ScanDirection, ExitReason } from "@/lib/types";
import { useGlossyMotion, statusPulse } from "@/lib/animations";

interface OperatorStatusBadgeProps {
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

export function OperatorStatusBadge({ direction, reason, className, size = "md" }: OperatorStatusBadgeProps) {
  const isGlossyMotion = useGlossyMotion();
  const isEntry = direction === "IN";

  const bgColor = isEntry
    ? "bgaction-primary/10"
    : reason === "Day Out"
    ? "bgaction-warning/10"
    : reason === "Leave"
    ? "bgaction-info/10"
    : "bgaction-danger/10";

  const textColor = isEntry
    ? "textaction-primary"
    : reason === "Day Out"
    ? "textaction-warning"
    : reason === "Leave"
    ? "textaction-info"
    : "textaction-danger";

  const dotColor = isEntry
    ? "bgaction-primary"
    : reason === "Day Out"
    ? "bgaction-warning"
    : reason === "Leave"
    ? "bgaction-info"
    : "bgaction-danger";

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
