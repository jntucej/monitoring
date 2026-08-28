"use client";

import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { CountUp } from "@/components/shared/CountUp";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  trend?: string;
  onClick?: () => void;
}

export function StatCard({ label, value, icon: Icon, color, trend, onClick }: StatCardProps) {
  const numericValue = typeof value === "number" ? value : parseFloat(String(value).replace(/,/g, ""));
  const isNumeric = !isNaN(numericValue);

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      onClick={onClick}
      className={`group relative overflow-hidden bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-5 transition-all duration-300 ${
        onClick ? "cursor-pointer hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10" : ""
      }`}
    >
      {/* Reactive Ambient Back Glow */}
      <div
        className="absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none"
        style={{ backgroundColor: color }}
      />

      <div className="relative z-10 flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 shadow-sm"
          style={{ backgroundColor: `${color}18`, color }}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
          <p className="kpi-number text-fluid-2xl text-[var(--text-primary)] mt-1">
            {isNumeric ? <CountUp value={numericValue} /> : value}
          </p>
          {trend ? (
            <p className="text-xs font-medium text-[var(--text-muted)] mt-1 truncate">{trend}</p>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
