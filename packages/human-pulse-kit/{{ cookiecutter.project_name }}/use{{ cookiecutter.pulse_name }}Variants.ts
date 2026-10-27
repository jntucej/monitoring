import type { Variants } from "framer-motion";

export const BEAT = {
  duration: {{ cookiecutter.beat_duration_ms }} / 1000,
  times: [0, 0.10, 0.20, 0.30, 0.45] as number[],
  ease: "easeInOut" as const,
  repeat: Infinity,
  repeatDelay: {{ cookiecutter.repeat_delay_s }},
};

export const humanPulseVariants: Variants = {
  rest: { scale: 1, opacity: 1 },
  animate: {
    scale:   [1, {{ cookiecutter.lub_scale }}, 1, {{ cookiecutter.dub_scale }}, 1],
    opacity: [1, 1, {{ cookiecutter.rest_opacity }}, 1, {{ cookiecutter.rest_opacity }}],
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
