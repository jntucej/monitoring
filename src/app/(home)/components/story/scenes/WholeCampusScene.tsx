"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring, type MotionValue } from "framer-motion";
import { GlassPanel } from "../../ui/GlassPanel";
import { useReducedMotionSafe } from "../../hooks/useReducedMotionSafe";
import { usePerformanceTier } from "../../hooks/usePerformanceTier";
import {
  SPRING_LIQUID,
  SPRING_BOUNCE,
  EASE_DRIFT,
  DUR_BASE,
} from "../../hooks/useSpringConfig";
import type { LivePayload } from "../../hooks/useLiveData";

const POSITION: Record<string, { x: number; y: number; color: string; depth: number }> = {
  gate:     { x: 50, y: 12, color: "#F59E0B", depth: 1.4 },
  hostel:   { x: 82, y: 32, color: "#0EA5E9", depth: 1.1 },
  mess:     { x: 82, y: 68, color: "#10B981", depth: 1.1 },
  exam:     { x: 62, y: 88, color: "#EF4444", depth: 1.3 },
  labs:     { x: 38, y: 88, color: "#6366F1", depth: 1.3 },
  visitors: { x: 18, y: 68, color: "#F97316", depth: 1.0 },
  events:   { x: 18, y: 32, color: "#A78BFA", depth: 1.0 },
  users:    { x: 50, y: 50, color: "#F8FAFC", depth: 0.3 },
};

const LINKS: Array<[string, string]> = [
  ["gate", "hostel"],
  ["gate", "events"],
  ["gate", "users"],
  ["hostel", "mess"],
  ["mess", "exam"],
  ["exam", "labs"],
  ["labs", "visitors"],
  ["visitors", "events"],
  ["events", "users"],
  ["hostel", "users"],
];

function OrbitNode({
  module,
  index,
  progress,
  reduced,
  tier,
  useParallax,
}: {
  module: { id: string; label: string; active: boolean; count: number };
  index: number;
  progress: MotionValue<number>;
  reduced: boolean;
  tier: string;
  useParallax: boolean;
}) {
  const pos = POSITION[module.id];
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const nodeY = useTransform(
    progress,
    [0, 1],
    useParallax && pos ? [pos.depth * 20, pos.depth * -20] : [0, 0]
  );

  if (!pos) return null;

  return (
    <motion.g style={{ y: nodeY }}>
      <motion.circle
        cx={pos.x}
        cy={pos.y}
        r="3"
        fill={pos.color}
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: module.active ? 1 : 0.3 }}
        viewport={{ once: true }}
        transition={
          reduced ? { duration: 0 } : { ...SPRING_BOUNCE, delay: 0.15 + index * 0.06 }
        }
        style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
      />
      {!reduced && tier !== "static" && module.active && (
        <motion.circle
          cx={pos.x}
          cy={pos.y}
          r="3"
          fill="none"
          stroke={pos.color}
          strokeWidth="0.4"
          animate={{ r: [3, 7], opacity: [0.7, 0] }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            delay: index * 0.35,
            ease: EASE_DRIFT,
          }}
        />
      )}
      <text
        x={pos.x}
        y={pos.y + 7}
        textAnchor="middle"
        fill="#F8FAFC"
        fontSize="2.4"
        fontFamily="system-ui"
        opacity={module.active ? 0.85 : 0.4}
      >
        {module.label}
      </text>
    </motion.g>
  );
}

export function WholeCampusScene({ data }: { data: LivePayload | null }) {
  const reduced = useReducedMotionSafe();
  const tier = usePerformanceTier();
  const modules = data?.modules ?? [];
  const activeCount = modules.filter((m) => m.active).length;

  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 28, mass: 1 });
  const useParallax = tier !== "static" && !reduced;
  const orbitScale = useTransform(progress, [0, 0.5, 1], [0.94, 1, 0.96]);

  return (
    <GlassPanel variant="cinema" className="overflow-hidden p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-widest text-[var(--home-text-muted)]">
          Connected modules
        </div>
        <motion.div
          className="flex items-center gap-1.5 text-xs text-[#A78BFA]"
          animate={reduced ? {} : { opacity: [1, 0.6, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#A78BFA]" />
          {activeCount}/{modules.length || 8} live
        </motion.div>
      </div>
      <motion.div
        ref={ref}
        style={{ scale: useParallax ? orbitScale : 1 }}
        className="relative mx-auto aspect-square w-full max-w-sm"
      >
        <svg aria-hidden className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
          {LINKS.map(([a, b], i) => {
            const from = POSITION[a];
            const to = POSITION[b];
            if (!from || !to) return null;
            return (
              <motion.line
                key={`${a}-${b}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#64748B"
                strokeOpacity="0.3"
                strokeWidth="0.4"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { duration: DUR_BASE, delay: i * 0.05, ease: EASE_DRIFT }
                }
              />
            );
          })}
          {modules.map((m, i) => (
            <OrbitNode
              key={m.id}
              module={m}
              index={i}
              progress={progress}
              reduced={reduced}
              tier={tier}
              useParallax={useParallax}
            />
          ))}
        </svg>
      </motion.div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
        {modules.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={
              reduced ? { duration: 0 } : { ...SPRING_LIQUID, delay: 0.1 + i * 0.05 }
            }
            className="flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-1.5 text-[var(--home-text-muted)]">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  m.active ? "bg-[#10B981]" : "bg-[var(--home-text-muted)]"
                }`}
              />
              {m.label}
            </span>
            <span className="font-mono tabular-nums text-[var(--home-text-primary)]">
              {m.count.toLocaleString()}
            </span>
          </motion.div>
        ))}
      </div>
    </GlassPanel>
  );
}
