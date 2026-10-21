"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { EASE_OUT, revealViewport } from "./tokens";

type RevealProps = {
  as?:
    | "div"
    | "section"
    | "article"
    | "li"
    | "ul"
    | "header"
    | "footer"
    | "p"
    | "h1"
    | "h2"
    | "h3";
  delay?: number;
  duration?: number;
  y?: number;
  blur?: boolean;
  once?: boolean;
  children: React.ReactNode;
} & Omit<HTMLMotionProps<"div">, "ref">;

export function Reveal({
  as = "div",
  delay = 0,
  duration = 0.6,
  y = 24,
  blur = true,
  once = true,
  children,
  ...rest
}: RevealProps) {
  const reduced = useReducedMotion();
  const Tag = motion[as] as typeof motion.div;

  return (
    <Tag
      initial={
        reduced ? false : { opacity: 0, y, filter: blur ? "blur(8px)" : "blur(0px)" }
      }
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ ...revealViewport, once }}
      transition={{ duration, delay, ease: EASE_OUT }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
