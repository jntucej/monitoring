"use client";

import { motion } from "framer-motion";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";

interface KineticTypographyProps {
  text: string;
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  delay?: number;
  stagger?: number;
}

const container = (stagger: number, delay: number) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

const word = {
  hidden: { opacity: 0, y: "0.6em", filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: "0em",
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function KineticTypography({
  text,
  as = "h1",
  className = "",
  delay = 0,
  stagger = 0.055,
}: KineticTypographyProps) {
  const reduced = useReducedMotionSafe();
  const words = text.split(" ");

  if (reduced) {
    const Tag = as;
    return <Tag className={className}>{text}</Tag>;
  }

  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      variants={container(stagger, delay)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-10%" }}
    >
      {words.map((w, i) => (
        <span key={i} className="inline-block will-change-transform">
          <motion.span variants={word} className="inline-block">
            {w}
            {i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
      <span className="sr-only">{text}</span>
    </MotionTag>
  );
}
