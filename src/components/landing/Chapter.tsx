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
  const inView = useInView(ref, { once: true, margin: "-15% 0px -15% 0px" });
  const reduce = useReducedMotion();
  const visible = inView || !!reduce;
  const dim = !isActive && !reduce ? 0.3 : 1;

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
      className="relative flex min-h-[65vh] items-center justify-center px-6 py-24"
    >
      <motion.div
        animate={{ opacity: dim }}
        transition={{ duration: 1.4, ease: EASE.gentle }}
        className="flex flex-col items-center text-center"
      >
        <motion.span
          initial={reduce ? false : { opacity: 0, y: -10 }}
          animate={visible ? { opacity: 0.35, y: 0 } : {}}
          transition={{ duration: DURATION.chapter, ease: EASE.gentle }}
          className="mb-8 text-[11px] tabular-nums tracking-[0.5em] text-white/35"
        >
          CHAPTER {String(index).padStart(2, "0")}
        </motion.span>

        <motion.button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          aria-expanded={revealed}
          aria-label={revealed ? "Hide chapter detail" : "Show chapter detail"}
          className="group mb-10 h-32 w-40 cursor-pointer rounded-2xl p-2 text-inherit transition-colors hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:ring-offset-4 focus-visible:ring-offset-[#070B14]"
        >
          {visual({ progress, hovered, clicked: revealed, accent })}
          {showTapHint && !revealed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="mt-2 block text-[10px] uppercase tracking-[0.35em] text-cyan-300/60"
            >
              Tap to inspect
            </motion.span>
          )}
        </motion.button>

        <div className="overflow-hidden">
          <motion.h2
            id={`${id}-heading`}
            initial={reduce ? false : { y: "100%", opacity: 0 }}
            animate={visible ? { y: "0%", opacity: 1 } : {}}
            transition={{
              duration: DURATION.chapter,
              ease: EASE.gentle,
              delay: 0.15,
            }}
            className="max-w-2xl text-balance text-2xl font-light leading-snug tracking-tight text-white md:text-4xl"
          >
            {poetic}
          </motion.h2>
        </div>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 15 }}
          animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{
            duration: DURATION.chapter,
            ease: EASE.gentle,
            delay: 0.35,
          }}
          className="mt-5 max-w-lg text-base leading-relaxed text-white/65 md:text-lg"
        >
          {plain}
        </motion.p>

        {/* Tap-to-reveal detail */}
        <motion.div
          initial={false}
          animate={{
            height: revealed ? "auto" : 0,
            opacity: revealed ? 1 : 0,
            marginTop: revealed ? 16 : 0,
          }}
          transition={{ duration: 0.6, ease: EASE.gentle }}
          className="overflow-hidden"
        >
          <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur">
            <p className="text-sm italic leading-relaxed text-cyan-200/80">
              {detail}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
