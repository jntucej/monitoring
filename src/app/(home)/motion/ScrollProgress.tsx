"use client";

import { motion, useScroll, useSpring } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const x = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });

  return (
    <motion.div
      aria-hidden
      className="fixed left-0 top-0 z-[200] h-[2px] w-full origin-left bg-[var(--action-primary)]"
      style={{ scaleX: x }}
    />
  );
}
