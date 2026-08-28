"use client";

import { motion } from "framer-motion";
import { CountUp } from "@/components/shared/CountUp";

interface OperatorStatsProps {
  entries: number;
  exits: number;
  onCampus: number;
}

export function OperatorStats({ entries, exits, onCampus }: OperatorStatsProps) {
  const cards = [
    { label: "ENTRIES", value: entries, color: "text-[var(--action-primary)]", glow: "shadow-emerald-500/10" },
    { label: "EXITS", value: exits, color: "text-[var(--action-danger)]", glow: "shadow-red-500/10" },
    { label: "ON CAMPUS", value: onCampus, color: "text-[var(--focus-ring)]", glow: "shadow-sky-500/10" },
  ];

  return (
    <>
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 text-center ${card.glow}`}
        >
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase mb-1">{card.label}</p>
          <p className={`kpi-number text-fluid-2xl ${card.color}`}>
            <CountUp value={card.value} />
          </p>
        </motion.div>
      ))}
    </>
  );
}
