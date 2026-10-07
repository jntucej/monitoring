"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useUIStore } from "@/stores/uiStore";
import { useGlass } from "@/context/GlassContext";
import { wordStaggerContainer, wordItemVariant } from "@/lib/animations";

export interface WordByWordTextProps {
  text: string;
  className?: string;
  as?: "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4";
  delay?: number;
}

export function WordByWordText({ text, className = "", as = "span", delay = 0 }: WordByWordTextProps) {
  const theme = useUIStore((s) => s.theme);
  const { prefersReducedMotion, performanceTier, isTouchDevice } = useGlass();

  const isMobileOrLowFps =
    isTouchDevice ||
    performanceTier === "legacy" ||
    performanceTier === "emergency" ||
    performanceTier === "low" ||
    prefersReducedMotion;

  const words = useMemo(() => text.split(" "), [text]);

  const Container =
    as === "div"
      ? motion.div
      : as === "p"
      ? motion.p
      : as === "h1"
      ? motion.h1
      : as === "h2"
      ? motion.h2
      : as === "h3"
      ? motion.h3
      : as === "h4"
      ? motion.h4
      : motion.span;

  // On mobile or low FPS, perform a simple hardware-accelerated fade rather than heavy per-word DOM animations
  if (isMobileOrLowFps) {
    return (
      <Container
        key={`simple-${theme}-${text.slice(0, 10)}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, delay }}
        className={className}
      >
        {text}
      </Container>
    );
  }

  return (
    <Container
      key={`stagger-${theme}-${text.slice(0, 10)}`}
      variants={wordStaggerContainer}
      initial="hidden"
      animate="visible"
      className={`inline-flex flex-wrap gap-x-[0.25em] ${className}`}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          variants={wordItemVariant}
          className="inline-block"
        >
          {word}
        </motion.span>
      ))}
    </Container>
  );
}

export default WordByWordText;

