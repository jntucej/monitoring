"use client";

import { useRef, useState } from "react";
import {
  motion,
  useScroll,
  useInView,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { DURATION, EASE } from "@/components/cinematic";

export interface ChapterVisualProps {
  progress: MotionValue<number>;
  hovered: boolean;
  clicked: boolean;
  accent: string;
}

interface ChapterProps {
  id: string;
  index: number;
  poetic: string;
  plain: string;
  detail: string;
  accent: string;
  visual: (opts: ChapterVisualProps) => React.ReactNode;
  isActive: boolean;
  showTapHint?: boolean;
}

export function Chapter({
  id,
  index,
  poetic,
  plain,
  detail,
  accent,
  visual,
  isActive,
  showTapHint = false,
}: ChapterProps) {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px -20% 0px" });
  const reduce = useReducedMotion();
  const visible = inView || !!reduce;
  const dim = !isActive && !reduce ? 0.4 : 1;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const [hovered, setHovered] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const progress = reduce
    ? useTransform(scrollYProgress, () => 1)
    : scrollYProgress;

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      id={id}
      data-chapter-index={index}
      aria-labelledby={`${id}-heading`}
      className="relative flex min-h-[60vh] items-center justify-center px-6 py-20"
    >
      <motion.div
        animate={{ opacity: dim }}
        transition={{ duration: 1.4, ease: EASE.gentle }}
        className="flex flex-col items-center text-center"
      >
        <span className="mb-6 text-[10px] tabular-nums tracking-[0.4em] text-white/25">
          {String(index).padStart(2, "0")}
        </span>

        <motion.button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          aria-expanded={revealed}
          aria-label={revealed ? "Hide chapter detail" : "Show chapter detail"}
          className="group mb-8 h-28 w-36 cursor-pointer rounded-2xl p-2 text-inherit transition-colors hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:ring-offset-4 focus-visible:ring-offset-[#070B14]"
        >
          {visual({ progress, hovered, clicked: revealed, accent })}
          {showTapHint && !revealed && (
            <span className="mt-1 block text-[10px] uppercase tracking-[0.3em] text-white/30">
              Tap
            </span>
          )}
        </motion.button>

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

        {/* Tap-to-reveal detail */}
        <motion.div
          initial={false}
          animate={{
            height: revealed ? "auto" : 0,
            opacity: revealed ? 1 : 0,
            marginTop: revealed ? 14 : 0,
          }}
          transition={{ duration: 0.6, ease: EASE.gentle }}
          className="overflow-hidden"
        >
          <p className="mx-auto max-w-md text-sm italic leading-relaxed text-white/45">
            {detail}
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
