import type { Variants } from "framer-motion";

export const BEAT = {
  duration: 1100 / 1000,
  times: [0, 0.10, 0.20, 0.30, 0.45] as number[],
  ease: "easeInOut" as const,
  repeat: Infinity,
  repeatDelay: 0.6,
};

export const humanPulseVariants: Variants = {
  rest: { scale: 1, opacity: 1 },
  animate: {
    scale:   [1, 1.20, 1, 1.12, 1],
    opacity: [1, 1, 0.90, 1, 0.90],
    transition: BEAT,
  },
};

/**
 * Helper: spread the beat onto a motion.div without re-declaring keyframes.
 *
 *   <motion.div variants={humanPulseVariants} animate="animate" />
 *
 * Or with siblings staggered:
 *
 *   <motion.div {...staggeredBeat(120)} />
 */
export function staggeredBeat(delayMs = 0) {
  return {
    animate: humanPulseVariants.animate,
    transition: { ...BEAT, delay: delayMs / 1000 },
  };
}
