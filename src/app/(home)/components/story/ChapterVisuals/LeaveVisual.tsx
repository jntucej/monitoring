"use client";

import { motion } from "framer-motion";
import { useReducedMotionSafe } from "../../hooks/useReducedMotionSafe";

export function LeaveVisual() {
  const reduced = useReducedMotionSafe();
  const accent = "#F59E0B";

  return (
    <div className="relative aspect-[4/5] w-full max-w-md overflow-hidden rounded-2xl bg-[#0A0A0F]">
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 500"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="leave-spill" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.6" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="leave-lightbeam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>

        <motion.circle
          cx="200"
          cy="280"
          r="160"
          fill="url(#leave-spill)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: reduced ? 0 : 1.2 }}
        />

        <motion.rect
          x="140"
          y="200"
          width="120"
          height="240"
          fill="url(#leave-lightbeam)"
          initial={{ opacity: 0, scaleY: 0.2 }}
          whileInView={{ opacity: 1, scaleY: 1 }}
          viewport={{ once: true }}
          style={{ transformOrigin: "center top" }}
          transition={{ duration: reduced ? 0 : 1.0, delay: reduced ? 0 : 0.5 }}
        />

        <rect x="60" y="180" width="22" height="220" fill="#1E293B" stroke={accent} strokeOpacity="0.3" />
        <rect x="318" y="180" width="22" height="220" fill="#1E293B" stroke={accent} strokeOpacity="0.3" />
        <rect x="60" y="170" width="280" height="18" fill="#1E293B" stroke={accent} strokeOpacity="0.3" />

        <motion.rect
          x="82"
          y="370"
          width="220"
          height="8"
          rx="4"
          fill={accent}
          initial={{ rotate: 0 }}
          whileInView={{ rotate: -75 }}
          viewport={{ once: true }}
          style={{ transformOrigin: "82px 374px" }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.3 }
          }
        />

        <motion.g
          initial={{ x: 0, opacity: 0 }}
          whileInView={{ x: 40, opacity: 1 }}
          viewport={{ once: true }}
          transition={
            reduced ? { duration: 0 } : { duration: 2.4, ease: "easeInOut", delay: 1.0 }
          }
        >
          <circle cx="200" cy="300" r="10" fill="#0F172A" stroke={accent} strokeOpacity="0.5" />
          <rect x="192" y="312" width="16" height="50" rx="6" fill="#0F172A" stroke={accent} strokeOpacity="0.5" />
        </motion.g>

        <line x1="0" y1="400" x2="400" y2="400" stroke={accent} strokeOpacity="0.15" />
      </svg>
    </div>
  );
}
