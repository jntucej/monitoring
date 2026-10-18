"use client";

import { motion } from "framer-motion";
import { useReducedMotionSafe } from "../../hooks/useReducedMotionSafe";

export function ScanVisual() {
  const reduced = useReducedMotionSafe();
  const accent = "#0EA5E9";
  const danger = "#EF4444";

  return (
    <div className="relative aspect-[4/5] w-full max-w-md overflow-hidden rounded-2xl bg-[#0A0A0F]">
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 500"
        preserveAspectRatio="xMidYMid meet"
      >
        <rect
          x="100"
          y="140"
          width="200"
          height="240"
          rx="12"
          fill="#111827"
          stroke={accent}
          strokeOpacity="0.4"
        />
        <rect
          x="120"
          y="170"
          width="70"
          height="90"
          rx="6"
          fill="#1E293B"
          stroke={accent}
          strokeOpacity="0.25"
        />
        <circle cx="155" cy="200" r="14" fill="#0F172A" stroke={accent} strokeOpacity="0.4" />
        <ellipse cx="155" cy="240" rx="20" ry="16" fill="#0F172A" stroke={accent} strokeOpacity="0.4" />

        <rect x="210" y="180" width="70" height="6" rx="3" fill={accent} fillOpacity="0.3" />
        <rect x="210" y="196" width="55" height="4" rx="2" fill={accent} fillOpacity="0.15" />
        <rect x="210" y="210" width="65" height="4" rx="2" fill={accent} fillOpacity="0.15" />
        <rect x="120" y="290" width="160" height="4" rx="2" fill={accent} fillOpacity="0.15" />
        <rect x="120" y="306" width="120" height="4" rx="2" fill={accent} fillOpacity="0.15" />

        <motion.rect
          x="100"
          y="140"
          width="200"
          height="6"
          fill={accent}
          fillOpacity="0.7"
          initial={{ y: 140 }}
          whileInView={{ y: 374 }}
          viewport={{ once: true }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 2, ease: "easeInOut", delay: 0.4, repeat: Infinity, repeatType: "reverse" }
          }
          style={{ filter: `blur(1px)` }}
        />

        <motion.g
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={
            reduced ? { duration: 0 } : { duration: 0.6, delay: 2.6 }
          }
        >
          <circle cx="290" cy="180" r="16" fill={danger} fillOpacity="0.2" stroke={danger} strokeOpacity="0.8" />
          <path d="M 285 174 L 295 186 M 295 174 L 285 186" stroke={danger} strokeWidth="2" strokeLinecap="round" />
        </motion.g>
      </svg>
    </div>
  );
}
