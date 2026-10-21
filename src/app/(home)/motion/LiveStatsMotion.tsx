"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useLiveData } from "../components/hooks/useLiveData";
import { useCountUp } from "./useCountUp";
import { EASE_OUT, revealViewport } from "./tokens";

const ITEMS = [
  { key: "requestsToday" as const, label: "Requests today" },
  { key: "approvedToday" as const, label: "Approved today" },
  { key: "scansToday" as const, label: "Gate scans" },
  { key: "onCampusNow" as const, label: "On campus now", live: true },
];

export function LiveStatsMotion() {
  const data = useLiveData(25_000);
  return (
    <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 px-6 md:grid-cols-4">
      {ITEMS.map((item, i) => (
        <StatCard
          key={item.key}
          label={item.label}
          value={(data?.stats as any)[item.key] ?? null}
          live={item.live}
          delay={i * 0.12}
        />
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  live,
  delay,
}: {
  label: string;
  value: number | null;
  live?: boolean;
  delay: number;
}) {
  const n = useCountUp(value, 1600);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={revealViewport}
      transition={{ duration: 0.5, delay, ease: EASE_OUT }}
      className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/70 p-4"
    >
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
        {live && <PulseDot />}
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
        {value == null ? <Skeleton /> : n.toLocaleString()}
      </div>
    </motion.div>
  );
}

function PulseDot() {
  return (
    <span className="relative flex h-1.5 w-1.5">
      <motion.span
        className="absolute inset-0 rounded-full bg-[#22c55e]"
        animate={{ scale: [1, 2], opacity: [0.6, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: EASE_OUT }}
      />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
    </span>
  );
}

function Skeleton() {
  return (
    <span className="relative inline-block h-7 w-16 overflow-hidden rounded bg-white/10">
      <motion.span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
      />
    </span>
  );
}
