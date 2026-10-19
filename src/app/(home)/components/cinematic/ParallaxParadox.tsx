"use client";

import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";

export function ParallaxParadox() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();

  const smooth = useSpring(scrollYProgress, {
    stiffness: 55,
    damping: 22,
    mass: 0.7,
  });

  const farY     = useTransform(smooth, [0, 1], ["0%", "12%"]);
  const midY     = useTransform(smooth, [0, 1], ["0%", "35%"]);
  const nearY    = useTransform(smooth, [0, 1], ["0%", "70%"]);
  const paradoxY = useTransform(smooth, [0, 1], ["0%", "-25%"]);   // the reversal
  const farScale = useTransform(smooth, [0, 1], [1, 1.14]);
  const midScale = useTransform(smooth, [0, 1], [1, 1.06]);
  const paradoxO = useTransform(smooth, [0, 0.5, 1], [0.10, 0.32, 0.10]);
  const grainO   = useTransform(smooth, [0, 1], [0.04, 0.10]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
    >
      {/* Layer 1 — far nebula */}
      <motion.div style={{ y: farY, scale: farScale }} className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.14),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.10),transparent_60%)]" />
      </motion.div>

      {/* Layer 2 — perspective grid */}
      <motion.div
        style={{ y: midY, scale: midScale }}
        className="absolute inset-0 opacity-[0.07] mix-blend-screen"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage:
              "radial-gradient(ellipse at 50% 40%, black 15%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at 50% 40%, black 15%, transparent 75%)",
          }}
        />
      </motion.div>

      {/* Layer 3 — near horizon */}
      <motion.div
        style={{ y: nearY }}
        className="absolute inset-x-0 -bottom-10 h-[70vh]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(251,191,36,0.12),transparent_60%)]" />
      </motion.div>

      {/* Layer 4 — THE PARADOX (moves against scroll) */}
      <motion.div
        style={{ y: paradoxY, opacity: paradoxO }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.22),transparent_70%)] blur-3xl" />
        <div className="absolute w-[30vw] h-[30vw] rounded-full border border-white/[0.06]" />
      </motion.div>

      {/* Layer 5 — film grain */}
      <motion.div
        style={{ opacity: grainO }}
        className="absolute inset-0"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundSize: "200px 200px",
          }}
        />
      </motion.div>
    </div>
  );
}
