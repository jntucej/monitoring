"use client";

import { motion } from "framer-motion";
import { GlassPanel } from "../../ui/GlassPanel";
import { useReducedMotionSafe } from "../../hooks/useReducedMotionSafe";
import { usePerformanceTier } from "../../hooks/usePerformanceTier";
import { DUR_BASE, EASE_DRIFT } from "../../hooks/useSpringConfig";

const ORBS = [
  { label: "Gate",     color: "#F59E0B", x: 50, y: 15 },
  { label: "Mess",     color: "#10B981", x: 78, y: 32 },
  { label: "Hostel",   color: "#0EA5E9", x: 84, y: 62 },
  { label: "Labs",     color: "#6366F1", x: 65, y: 84 },
  { label: "Exam",     color: "#EF4444", x: 35, y: 84 },
  { label: "Visitors", color: "#F97316", x: 16, y: 62 },
  { label: "Events",   color: "#A78BFA", x: 22, y: 32 },
  { label: "AI",       color: "#F8FAFC", x: 50, y: 50 },
];

const LINES: Array<[number, number]> = [
  [0, 1], [0, 2], [0, 7], [2, 3], [3, 5], [3, 6], [5, 4], [1, 7], [7, 6],
];

export function WholeCampusScene() {
  const reduced = useReducedMotionSafe();
  const tier = usePerformanceTier();

  return (
    <GlassPanel variant="cinema" className="overflow-hidden p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-widest text-[var(--home-text-muted)]">
          Campus map · live
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#A78BFA]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#A78BFA]" />
          8 modules
        </div>
      </div>
      <div className="relative mx-auto aspect-square w-full max-w-sm">
        <svg aria-hidden className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
          {LINES.map(([a, b], i) => {
            const from = ORBS[a];
            const to = ORBS[b];
            return (
              <motion.line
                key={i}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke="#64748B" strokeOpacity="0.3" strokeWidth="0.4"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={reduced ? { duration: 0 } : { duration: DUR_BASE, delay: i * 0.06, ease: EASE_DRIFT }}
              />
            );
          })}
          {ORBS.map((orb, i) => (
            <g key={orb.label}>
              <motion.circle
                cx={orb.x} cy={orb.y} r="3"
                fill={orb.color}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 18, delay: 0.2 + i * 0.08 }}
                style={{ transformOrigin: `${orb.x}px ${orb.y}px` }}
              />
              {!reduced && tier !== "static" && (
                <motion.circle
                  cx={orb.x} cy={orb.y} r="3"
                  fill="none" stroke={orb.color} strokeWidth="0.4"
                  animate={{ r: [3, 7], opacity: [0.6, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3, ease: "easeOut" }}
                />
              )}
              <text x={orb.x} y={orb.y + 7} textAnchor="middle" fill="#F8FAFC" fontSize="2.4" fontFamily="system-ui" opacity="0.75">
                {orb.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-4 rounded-lg border border-[var(--home-border-soft)] bg-black/20 p-3">
        <div className="mb-1.5 text-[10px] uppercase tracking-widest text-[var(--home-text-muted)]">
          Ask the campus · 3 languages
        </div>
        <motion.div
          className="space-y-1 text-[11px] leading-relaxed text-[var(--home-text-secondary)]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.6 }}
        >
          <div><span className="mr-1.5 font-mono text-[#0EA5E9]">EN</span> Everything is quiet. 2,847 on campus.</div>
          <div><span className="mr-1.5 font-mono text-[#F59E0B]">TE</span> అంతా ప్రశాంతంగా ఉంది. 2,847 మంది క్యాంపస్‌లో.</div>
          <div><span className="mr-1.5 font-mono text-[#10B981]">HI</span> सब शांत है। परिसर में 2,847 लोग हैं।</div>
        </motion.div>
      </div>
    </GlassPanel>
  );
}
