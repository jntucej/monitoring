"use client";

import { motion } from "framer-motion";
import { DURATION, EASE } from "./motion-presets";

interface EmotionalQuoteProps {
  text: string;
  subtext?: string;
  className?: string;
}

/**
 * Contract Rule 1 — EmotionalQuote in loading / empty states, never a spinner.
 */
export function EmotionalQuote({
  text,
  subtext,
  className = "",
}: EmotionalQuoteProps) {
  return (
    <motion.div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 py-10 text-center ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURATION.quote, ease: EASE.gentle }}
    >
      <p className="max-w-md text-base italic tracking-wide text-white/75 md:text-lg">
        {text}
      </p>
      {subtext && <p className="max-w-sm text-xs text-white/40">{subtext}</p>}
    </motion.div>
  );
}
