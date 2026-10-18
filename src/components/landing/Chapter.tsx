"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { DURATION, EASE } from "@/components/cinematic";

interface ChapterProps {
  id: string;
  index: number;
  poetic: string;
  plain: string;
  visual: (active: boolean) => React.ReactNode;
  isActive: boolean;
}

export function Chapter({
  id,
  index,
  poetic,
  plain,
  visual,
  isActive,
}: ChapterProps) {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px -20% 0px" });
  const reduce = useReducedMotion();
  const visible = inView || !!reduce;
  const dim = !isActive && !reduce ? 0.35 : 1;

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      id={id}
      data-chapter-index={index}
      aria-labelledby={`${id}-heading`}
      className="relative flex min-h-[55vh] items-center justify-center px-6 py-20"
    >
      <motion.div
        animate={{ opacity: dim }}
        transition={{ duration: 1.4, ease: EASE.gentle }}
        className="flex flex-col items-center text-center"
      >
        <span className="mb-8 text-[10px] tabular-nums tracking-[0.4em] text-white/25">
          {String(index).padStart(2, "0")}
        </span>
        <motion.div
          className="mb-10 h-24 w-32"
          whileHover={reduce ? undefined : { scale: 1.06 }}
          transition={{ duration: 0.6, ease: EASE.gentle }}
        >
          {visual(visible)}
        </motion.div>
        <motion.h2
          id={`${id}-heading`}
          initial={reduce ? false : { y: 14 }}
          animate={visible ? { y: 0 } : {}}
          transition={{
            duration: DURATION.chapter,
            ease: EASE.gentle,
            delay: 0.1,
          }}
          className="max-w-2xl text-balance text-2xl font-light leading-snug tracking-tight text-white md:text-3xl"
        >
          {poetic}
        </motion.h2>
        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          animate={visible ? { opacity: 1 } : {}}
          transition={{
            duration: DURATION.chapter,
            ease: EASE.gentle,
            delay: 0.35,
          }}
          className="mt-4 max-w-md text-sm leading-relaxed text-white/60 md:text-base"
        >
          {plain}
        </motion.p>
      </motion.div>
    </section>
  );
}
