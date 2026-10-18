"use client";

import { motion } from "framer-motion";
import { SPRING_STORY } from "../hooks/useSpringConfig";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";

export interface EmotionalQuoteProps {
  text: string;
  subtext?: string;
  className?: string;
}

/**
 * Word-by-word reveal. Each word springs in with SPRING_STORY,
 * staggered 60ms apart. Triggers on entering the viewport, once.
 *
 * Reduced motion: renders the whole text at once.
 */
export function EmotionalQuote({
  text,
  subtext,
  className = "",
}: EmotionalQuoteProps) {
  const reduced = useReducedMotionSafe();
  const words = text.split(" ");

  return (
    <div className={className}>
      {reduced ? (
        <p className="font-serif text-4xl md:text-5xl leading-tight tracking-tight text-[var(--home-text-primary)]">
          {text}
        </p>
      ) : (
        <motion.p
          className="font-serif text-4xl md:text-5xl leading-tight tracking-tight text-[var(--home-text-primary)]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } },
          }}
        >
          {words.map((word, i) => (
            <motion.span
              key={i}
              className="mr-[0.25em] inline-block"
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: SPRING_STORY },
              }}
            >
              {word}
            </motion.span>
          ))}
        </motion.p>
      )}

      {subtext && (
        <p className="mt-4 text-base md:text-lg text-[var(--home-text-secondary)]">
          {subtext}
        </p>
      )}
    </div>
  );
}
