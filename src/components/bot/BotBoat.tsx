"use client";
import { memo } from "react";
import { motion } from "framer-motion";

type Phase = "idle" | "listening" | "thinking" | "speaking";

export const BotBoat = memo(function BotBoat({
  phase = "idle", size = 34,
}: { phase?: Phase; size?: number }) {
  const animate = (() => {
    switch (phase) {
      case "listening": return { y: [0, -2, 0], rotate: [-2, 2, -2] };
      case "thinking":  return { y: [0, -3, 0, -2, 0], rotate: [-5, 5, -5] };
      case "speaking":  return { y: [0, -4, 0, -3, 0], rotate: [-6, 6, -6] };
      default:          return { y: [0, -2.5, 0], rotate: [-3, 3, -3] };
    }
  })();
  const duration = phase === "thinking" ? 1.4 : phase === "speaking" ? 1.0 : 3.4;

  // Theme-aware ink: the boat was hardcoded white (stroke="white" /
  // fill="white"), which disappears on the light / light-blue themes where
  // the button surface is light. --text-primary flips with the theme
  // (near-white on dark themes, near-black on light themes), so the boat
  // is always legible against its own bg-[var(--bg-surface)] circle.
  const ink = "var(--text-primary)";
  const inkDim = "color-mix(in srgb, var(--text-primary) 60%, transparent)";

  return (
    <motion.svg
      width={size} height={size} viewBox="0 0 40 40" fill="none"
      animate={animate}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden
    >
      <path d="M20 4 L20 24" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 6 L32 21 L20 21 Z" fill={ink} fillOpacity="0.95" />
      <path d="M19 10 L10 21 L19 21 Z" fill={inkDim} />
      <path d="M6 25 H34 L30 33 H10 Z" fill={ink} fillOpacity="0.98" />
      {(phase === "speaking" || phase === "thinking") && (
        <>
          <motion.path
            d="M4 35 Q10 37 16 35 T28 35 T38 34"
            stroke={ink} strokeWidth="1.4" strokeLinecap="round" fill="none" strokeOpacity="0.85"
            animate={{ x: [0, 3, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          />
          <motion.path
            d="M2 38 Q9 40 15 38 T27 38 T36 37"
            stroke={ink} strokeWidth="1.2" strokeLinecap="round" fill="none" strokeOpacity="0.55"
            animate={{ x: [0, -3, 0], opacity: [0.3, 0.9, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        </>
      )}
    </motion.svg>
  );
});
