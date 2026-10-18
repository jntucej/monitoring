"use client";

import { motion } from "framer-motion";

interface VisualProps {
  active: boolean;
  accent: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/* 01 — The Gate: two pillars of light draw down, a small dot appears between them. */
export function GateVisual({ active, accent }: VisualProps) {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full" aria-hidden="true">
      <motion.line
        x1="60"
        y1="20"
        x2="60"
        y2="140"
        stroke={accent}
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={active ? { pathLength: 1, opacity: 0.75 } : {}}
        transition={{ duration: 1.4, ease: EASE }}
      />
      <motion.line
        x1="140"
        y1="20"
        x2="140"
        y2="140"
        stroke={accent}
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={active ? { pathLength: 1, opacity: 0.75 } : {}}
        transition={{ duration: 1.4, delay: 0.3, ease: EASE }}
      />
      <motion.circle
        cx="100"
        cy="80"
        r="3"
        fill={accent}
        initial={{ opacity: 0, scale: 0 }}
        animate={active ? { opacity: 0.95, scale: 1 } : {}}
        transition={{ duration: 0.8, delay: 1.5 }}
      />
    </svg>
  );
}

/* 02 — The Scan: a card, a scan line sweeping, then a small tick. */
export function ScanVisual({ active, accent }: VisualProps) {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full" aria-hidden="true">
      <motion.rect
        x="45"
        y="50"
        width="110"
        height="60"
        rx="8"
        fill="none"
        stroke={accent}
        strokeOpacity="0.35"
        strokeWidth="1"
        initial={{ opacity: 0 }}
        animate={active ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
      />
      <motion.rect
        x="45"
        y="50"
        width="110"
        height="2"
        fill={accent}
        fillOpacity="0.8"
        initial={{ y: 50, opacity: 0 }}
        animate={active ? { y: [50, 108, 50], opacity: [0, 1, 1, 0] } : {}}
        transition={{
          duration: 2.2,
          delay: 0.6,
          times: [0, 0.4, 0.9, 1],
          ease: "easeInOut",
        }}
      />
      <motion.path
        d="M 92 80 L 100 88 L 112 76"
        stroke={accent}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={active ? { pathLength: 1, opacity: 0.95 } : {}}
        transition={{ duration: 0.5, delay: 3, ease: "easeOut" }}
      />
    </svg>
  );
}

/* 03 — The Pass: a dashed line draws across three stops. */
export function PassVisual({ active, accent }: VisualProps) {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full" aria-hidden="true">
      <motion.line
        x1="50"
        y1="80"
        x2="150"
        y2="80"
        stroke={accent}
        strokeOpacity="0.6"
        strokeWidth="1.2"
        strokeDasharray="3 6"
        initial={{ pathLength: 0 }}
        animate={active ? { pathLength: 1 } : {}}
        transition={{ duration: 2, ease: EASE }}
      />
      {[50, 100, 150].map((x, i) => (
        <motion.circle
          key={x}
          cx={x}
          cy={80}
          r="5"
          fill={accent}
          initial={{ scale: 0, opacity: 0 }}
          animate={active ? { scale: 1, opacity: [0.4, 1, 0.7] } : {}}
          transition={{ duration: 0.7, delay: 0.4 + i * 0.6 }}
        />
      ))}
    </svg>
  );
}

/* 04 — The Approval: a hand-drawn signature, then a small seal. */
export function ApprovalVisual({ active, accent }: VisualProps) {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full" aria-hidden="true">
      <motion.path
        d="M 40 100 C 60 60, 70 120, 90 80 S 120 100, 130 70"
        stroke={accent}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={active ? { pathLength: 1, opacity: 0.9 } : {}}
        transition={{ duration: 1.8, ease: EASE }}
      />
      <motion.circle
        cx="150"
        cy="70"
        r="14"
        fill="none"
        stroke={accent}
        strokeWidth="1.2"
        strokeOpacity="0.8"
        initial={{ scale: 0, opacity: 0 }}
        animate={active ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 0.6, delay: 2 }}
      />
      <motion.path
        d="M 144 70 L 148 74 L 156 64"
        stroke={accent}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={active ? { pathLength: 1 } : {}}
        transition={{ duration: 0.4, delay: 2.5 }}
      />
    </svg>
  );
}

/* 05 — The Return: two arrows converging. */
export function ReturnVisual({ active, accent }: VisualProps) {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full" aria-hidden="true">
      <motion.path
        d="M 30 70 L 170 70"
        stroke={accent}
        strokeWidth="1.3"
        strokeOpacity="0.65"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={active ? { pathLength: 1 } : {}}
        transition={{ duration: 1.6, ease: EASE }}
      />
      <motion.path
        d="M 150 62 L 170 70 L 150 78"
        stroke={accent}
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ opacity: 0 }}
        animate={active ? { opacity: 0.9 } : {}}
        transition={{ duration: 0.4, delay: 1.4 }}
      />
      <motion.path
        d="M 170 100 L 30 100"
        stroke={accent}
        strokeWidth="1.3"
        strokeOpacity="0.65"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={active ? { pathLength: 1 } : {}}
        transition={{ duration: 1.6, delay: 0.5, ease: EASE }}
      />
      <motion.path
        d="M 50 92 L 30 100 L 50 108"
        stroke={accent}
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ opacity: 0 }}
        animate={active ? { opacity: 0.9 } : {}}
        transition={{ duration: 0.4, delay: 1.9 }}
      />
    </svg>
  );
}

/* 06 — The Quiet: a small breathing dot with two expanding rings. */
export function QuietVisual({ active, accent }: VisualProps) {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full" aria-hidden="true">
      <motion.circle
        cx="100"
        cy="80"
        r="5"
        fill={accent}
        initial={{ opacity: 0 }}
        animate={active ? { opacity: 0.95 } : {}}
        transition={{ duration: 0.6 }}
      />
      {[0, 0.9].map((delay, i) => (
        <motion.circle
          key={i}
          cx="100"
          cy="80"
          r="10"
          fill="none"
          stroke={accent}
          strokeWidth="1"
          initial={{ scale: 1, opacity: 0 }}
          animate={active ? { scale: [1, 4.5], opacity: [0.6, 0] } : {}}
          transition={{
            duration: 3,
            delay: delay + 0.4,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
    </svg>
  );
}
