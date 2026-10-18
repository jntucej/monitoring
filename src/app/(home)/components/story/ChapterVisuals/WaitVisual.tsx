"use client";

import { motion } from "framer-motion";
import { useReducedMotionSafe } from "../../hooks/useReducedMotionSafe";

export function WaitVisual() {
  const reduced = useReducedMotionSafe();
  const accent = "#6366F1";

  return (
    <div className="relative aspect-[4/5] w-full max-w-md overflow-hidden rounded-2xl bg-[#0A0A0F]">
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 55%, ${accent}33 0%, transparent 60%)`,
        }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: reduced ? 0 : 1.2 }}
      />
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 500"
        preserveAspectRatio="xMidYMid meet"
      >
        <rect
          x="140"
          y="120"
          width="120"
          height="240"
          rx="18"
          fill="#111827"
          stroke={accent}
          strokeOpacity="0.4"
        />
        <rect
          x="150"
          y="135"
          width="100"
          height="210"
          rx="10"
          fill="#0A0A0F"
        />
        <rect x="164" y="160" width="70" height="6" rx="3" fill={accent} fillOpacity="0.2" />
        <rect x="164" y="180" width="50" height="4" rx="2" fill={accent} fillOpacity="0.15" />
        <rect x="164" y="194" width="60" height="4" rx="2" fill={accent} fillOpacity="0.15" />
        <rect x="164" y="208" width="40" height="4" rx="2" fill={accent} fillOpacity="0.15" />

        <motion.g
          initial={{ y: -20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={
            reduced ? { duration: 0 } : { duration: 1.2, delay: 0.8, ease: [0.16, 1, 0.3, 1] }
          }
        >
          <motion.rect
            x="158"
            y="240"
            width="84"
            height="80"
            rx="8"
            fill={accent}
            fillOpacity="0.15"
            stroke={accent}
            strokeOpacity="0.6"
            animate={
              reduced
                ? undefined
                : { fillOpacity: [0.15, 0.35, 0.15] }
            }
            transition={
              reduced ? undefined : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
            }
          />
          <text
            x="200"
            y="258"
            textAnchor="middle"
            fill={accent}
            fontSize="8"
            fontFamily="system-ui"
            fontWeight={600}
            letterSpacing="0.5"
          >
            GATE 1
          </text>
          <text
            x="200"
            y="278"
            textAnchor="middle"
            fill="#F8FAFC"
            fontSize="9"
            fontFamily="system-ui"
          >
            Entered Hostel
          </text>
          <text
            x="200"
            y="294"
            textAnchor="middle"
            fill={accent}
            fontSize="10"
            fontFamily="system-ui"
            fontWeight={600}
          >
            8:52 PM
          </text>
        </motion.g>
      </svg>

      {!reduced && (
        <>
          <motion.div
            className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ border: `1px solid ${accent}`, opacity: 0.4 }}
            animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ border: `1px solid ${accent}`, opacity: 0.4 }}
            animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 1.5 }}
          />
        </>
      )}
    </div>
  );
}
