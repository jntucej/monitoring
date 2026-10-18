"use client";

import { motion } from "framer-motion";
import { useReducedMotionSafe } from "../../hooks/useReducedMotionSafe";

export function QuietVisual() {
  const reduced = useReducedMotionSafe();
  const accent = "#1E3A5F";
  const moonLight = "#CBD5E1";

  return (
    <div className="relative aspect-[4/5] w-full max-w-md overflow-hidden rounded-2xl bg-[#0A0A0F]">
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 500"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="quiet-moon" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F1F5F9" />
            <stop offset="60%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#64748B" />
          </radialGradient>
        </defs>

        <rect width="400" height="500" fill="#060B16" />

        <motion.g
          initial={{ y: 40, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={
            reduced ? { duration: 0 } : { duration: 3, ease: "easeOut" }
          }
        >
          <circle cx="300" cy="120" r="60" fill={moonLight} fillOpacity="0.08" />
          <circle cx="300" cy="120" r="40" fill="url(#quiet-moon)" />
        </motion.g>

        {!reduced && (
          <g>
            {Array.from({ length: 30 }).map((_, i) => {
              const seed = i * 9301 + 49297;
              const r = ((seed * 233) % 233280) / 233280;
              const r2 = ((seed * 631) % 233280) / 233280;
              return (
                <motion.circle
                  key={i}
                  cx={r * 400}
                  cy={r2 * 200}
                  r={0.8 + (r2 * 1.2)}
                  fill="#F8FAFC"
                  animate={{ opacity: [0.2, 0.9, 0.2] }}
                  transition={{
                    duration: 2 + (r * 3),
                    repeat: Infinity,
                    delay: r2 * 4,
                    ease: "easeInOut",
                  }}
                />
              );
            })}
          </g>
        )}

        <g>
          <rect x="80" y="280" width="18" height="140" fill={accent} />
          <rect x="302" y="280" width="18" height="140" fill={accent} />
          <rect x="80" y="270" width="240" height="16" fill={accent} />
          {Array.from({ length: 10 }).map((_, i) => (
            <rect key={i} x={100 + i * 22} y="290" width="4" height="130" fill={accent} fillOpacity="0.7" />
          ))}
        </g>

        <g transform="translate(185, 350)">
          <rect x="0" y="12" width="30" height="24" rx="3" fill={accent} fillOpacity="0.8" stroke={moonLight} strokeOpacity="0.4" />
          <path d="M 6 12 V 8 a 9 9 0 0 1 18 0 V 12" stroke={moonLight} strokeOpacity="0.6" strokeWidth="2" fill="none" />
        </g>

        <motion.rect
          x="230"
          y="180"
          width="12"
          height="14"
          fill="#FBBF24"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: [0, 1, 0.7, 1] }}
          viewport={{ once: true }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 4, delay: 1.5, ease: "easeInOut" }
          }
          style={{ filter: "drop-shadow(0 0 8px #FBBF24)" }}
        />
      </svg>
    </div>
  );
}
