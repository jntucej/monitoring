"use client";

import { motion } from "framer-motion";
import type { ComponentType } from "react";
import { BedDouble, Backpack, Briefcase, ShieldCheck, UserRound, Users, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { CategoryBreakdown, PersonCategoryKey } from "@/lib/types";

interface BreakdownPanelProps {
  breakdown: CategoryBreakdown | null;
}

const META: Array<{ key: PersonCategoryKey; label: string; icon: ComponentType<{ className?: string }>; color: string }> = [
  { key: "hostellers", label: "Hostellers", icon: BedDouble, color: "text-sky-400" },
  { key: "dayscholars", label: "Dayscholars", icon: Backpack, color: "text-violet-400" },
  { key: "facultyStaff", label: "Faculty & Staff", icon: Briefcase, color: "text-amber-400" },
  { key: "authorities", label: "Authorities", icon: ShieldCheck, color: "text-emerald-400" },
  { key: "visitors", label: "Visitors", icon: UserRound, color: "text-pink-400" },
  { key: "others", label: "Others", icon: Users, color: "text-[var(--text-secondary)]" },
];

export function BreakdownPanel({ breakdown }: BreakdownPanelProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-bold text-sm flex items-center gap-2 px-1">
        <Users className="w-4 h-4 text-[var(--focus-ring)]" />
        Inside Campus — by Category
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {META.map(({ key, label, icon: Icon, color }, i) => {
          const stat = breakdown?.[key] ?? { inside: 0, inToday: 0, outToday: 0 };
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-3 text-center"
            >
              <p className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                {label}
              </p>
              <p className={`text-2xl font-bold tabular-nums mt-1 ${color}`}>{formatNumber(stat.inside)}</p>
              <p className="text-[9px] text-[var(--text-muted)] uppercase font-semibold">Inside now</p>
              <div className="flex items-center justify-center gap-3 mt-1.5 text-[10px] font-bold">
                <span className="text-emerald-400 inline-flex items-center gap-0.5">
                  <ArrowDownLeft className="w-3 h-3" /> {stat.inToday}
                </span>
                <span className="text-[var(--action-danger)] inline-flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" /> {stat.outToday}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
