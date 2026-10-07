"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ElasticPillProps {
  label: string;
  color?: "emerald" | "rose" | "amber" | "slate" | "indigo";
  onClick?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

/**
 * Spring-driven interactive status pill.
 * Stretches on tap/click with spring physics for quick operational actions.
 */
export function ElasticPill({
  label,
  color = "emerald",
  onClick,
  className = "",
  icon,
}: ElasticPillProps) {
  const colorStyles = {
    emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20",
    rose: "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20",
    amber: "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20",
    slate: "bg-slate-500/10 border-slate-500/30 text-slate-300 hover:bg-slate-500/20",
    indigo: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20",
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 18 }}
      className={cn(
        "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full backdrop-blur-md border text-xs font-mono tracking-wider uppercase font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 select-none",
        colorStyles[color],
        className
      )}
    >
      {icon}
      <span>{label}</span>
    </motion.button>
  );
}

export default ElasticPill;
