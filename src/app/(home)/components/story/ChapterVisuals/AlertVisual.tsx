"use client";

import { motion } from "framer-motion";
import { useReducedMotionSafe } from "../../hooks/useReducedMotionSafe";

export function AlertVisual() {
  const reduced = useReducedMotionSafe();
  const accent = "#EF4444";

  return (
    <div className="relative aspect-[4/5] w-full max-w-md overflow-hidden rounded-2xl bg-[#0A0A0F]">
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 500"
        preserveAspectRatio="xMidYMid meet"
      >
        <g stroke={accent} strokeOpacity="0.08" strokeWidth="1">
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={`h-${i}`} x1="40" y1={80 + i * 40} x2="360" y2={80 + i * 40} />
          ))}
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`v-${i}`} x1={40 + i * 40} y1="80" x2={40 + i * 40} y2="440" />
          ))}
        </g>

        <rect x="100" y="200" width="80" height="60" fill={accent} fillOpacity="0.08" stroke={accent} strokeOpacity="0.2" />
        <rect x="220" y="240" width="100" height="80" fill={accent} fillOpacity="0.08" stroke={accent} strokeOpacity="0.2" />
        <rect x="140" y="320" width="60" height="50" fill={accent} fillOpacity="0.08" stroke={accent} strokeOpacity="0.2" />

        <g>
          {!reduced && (
            <>
              <motion.circle
                cx="240"
                cy="270"
                r="20"
                fill="none"
                stroke={accent}
                strokeWidth="2"
                animate={{ r: [20, 50], opacity: [0.6, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.circle
                cx="240"
                cy="270"
                r="20"
                fill="none"
                stroke={accent}
                strokeWidth="2"
                animate={{ r: [20, 50], opacity: [0.6, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 1 }}
              />
            </>
          )}
          <circle cx="240" cy="270" r="8" fill={accent} />
          <circle cx="240" cy="270" r="4" fill="#FEE2E2" />
        </g>

        <motion.g
          initial={{ y: -30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={
            reduced ? { duration: 0 } : { duration: 0.8, delay: 1.2, ease: [0.16, 1, 0.3, 1] }
          }
        >
          <rect
            x="60"
            y="60"
            width="280"
            height="44"
            rx="8"
            fill={accent}
            fillOpacity="0.15"
            stroke={accent}
            strokeOpacity="0.6"
          />
          <circle cx="84" cy="82" r="6" fill={accent} />
          <text x="104" y="80" fill="#F8FAFC" fontSize="11" fontFamily="system-ui" fontWeight={600}>
            Curfew override
          </text>
          <text x="104" y="95" fill={accent} fontSize="9" fontFamily="system-ui">
            Student · Medical center · 9:32 PM
          </text>
        </motion.g>
      </svg>
    </div>
  );
}
