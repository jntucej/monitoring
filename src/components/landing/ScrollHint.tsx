"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "@/components/cinematic";

export function ScrollHint() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.6, duration: 1.4, ease: EASE.gentle }}
      className="flex flex-col items-center gap-3 pb-12 pt-4 text-white/45"
    >
      <span className="text-[10px] uppercase tracking-[0.32em]">
        How it works
      </span>
      <motion.svg
        width="16"
        height="22"
        viewBox="0 0 16 22"
        fill="none"
        animate={reduce ? undefined : { y: [0, 6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          d="M8 2 V18 M2 12 L8 18 L14 12"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>
      <span className="text-[10px] uppercase tracking-[0.28em] text-white/25">
        Scroll
      </span>
    </motion.div>
  );
}
