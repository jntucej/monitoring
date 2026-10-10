"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CountUp } from "@/components/shared/CountUp";
import { GlossyFloatingContainer } from "@/components/shared/GlossyFloatingContainer";
import { ArrowUpRight } from "lucide-react";

interface OperatorStatsProps {
  gateId?: string;
  entries: number;
  exits: number;
  onCampus: number;
}

export function OperatorStats({ entries, exits, onCampus, gateId }: OperatorStatsProps) {
  const router = useRouter();

  const cards = [
    {
      id: "ENTRIES",
      label: "ENTRIES",
      emoji: "📥",
      value: entries,
      color: "text-[var(--action-primary)]",
      glow: "shadow-emerald-500/10",
      href: gateId ? `/gate/${gateId}?tab=history` : "/admin/reports",
    },
    {
      id: "EXITS",
      label: "EXITS",
      emoji: "📤",
      value: exits,
      color: "text-[var(--action-danger)]",
      glow: "shadow-red-500/10",
      href: gateId ? `/gate/${gateId}?tab=history` : "/admin/attendance",
    },
    {
      id: "ON CAMPUS",
      label: "ON CAMPUS",
      emoji: "🏕",
      value: onCampus,
      color: "text-[var(--focus-ring)]",
      glow: "shadow-sky-500/10",
      href: gateId ? `/gate/${gateId}?tab=stats` : "/admin/occupancy",
    },
  ];

  return (
    <>
      {cards.map((card, i) => (
        <GlossyFloatingContainer key={card.label} floatDelay={i * 0.3} floatDistance={-7}>
          <motion.div
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push(card.href)}
            className={`bg-[var(--bg-surface)] border border-[var(--border)] hover:border-indigo-500/40 rounded-xl p-4 text-center cursor-pointer transition-all duration-300 group shadow-sm ${card.glow}`}
            title={`Click to view full dedicated page for ${card.label}`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase truncate">
                <span className="sm:hidden">{card.emoji || "📊"}</span>
                <span className="hidden sm:inline">{card.emoji || "📊"} {card.label}</span>
              </p>
              <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
            <p className={`kpi-number text-fluid-2xl font-extrabold ${card.color}`}>
              <CountUp value={card.value} />
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono hidden sm:block">Open Full Page</p>
          </motion.div>
        </GlossyFloatingContainer>
      ))}
    </>
  );
}

export default OperatorStats;



