"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView } from "framer-motion";
import type { Chapter } from "./data";
import { EmotionalQuote } from "../cinematic";
import { SPRING_STORY } from "../hooks/useSpringConfig";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";

export interface StoryChapterProps {
  chapter: Chapter;
  visual: ReactNode;
}

export function StoryChapter({ chapter, visual }: StoryChapterProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.3 });
  const reduced = useReducedMotionSafe();

  const num = String(chapter.order).padStart(2, "0");
  const accentVar = `var(--home-accent-${chapter.accent})`;

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        ...SPRING_STORY,
        delay: reduced ? 0 : i * 0.12,
      },
    }),
  };

  return (
    <section
      ref={sectionRef}
      id={`chapter-${chapter.id}`}
      data-chapter={chapter.id}
      className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-24 md:px-10"
    >
      <div className="grid gap-12 md:grid-cols-2 md:items-center">
        <div className="order-2 md:order-1">
          <motion.div
            custom={0}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={variants}
            className="mb-6 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em]"
            style={{ color: accentVar }}
          >
            <span>{num}</span>
            <span className="h-px w-8" style={{ background: accentVar }} />
            <span>{chapter.title}</span>
          </motion.div>

          <motion.p
            custom={1}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={variants}
            className="mb-3 text-lg leading-relaxed md:text-xl"
            style={{ color: "var(--home-text-primary)" }}
          >
            {chapter.setup}
          </motion.p>

          <motion.p
            custom={2}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={variants}
            className="mb-3 text-base leading-relaxed md:text-lg"
            style={{ color: "var(--home-text-secondary)" }}
          >
            {chapter.tension}
          </motion.p>

          <motion.p
            custom={3}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={variants}
            className="mb-8 text-base leading-relaxed md:text-lg"
            style={{ color: "var(--home-text-secondary)" }}
          >
            {chapter.resolution}
          </motion.p>

          <motion.div
            custom={4}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={variants}
          >
            <EmotionalQuote
              text={chapter.payoff}
              className="max-w-xl"
            />
          </motion.div>
        </div>

        <div className="order-1 md:order-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
            transition={reduced ? { duration: 0 } : SPRING_STORY}
          >
            {visual}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
