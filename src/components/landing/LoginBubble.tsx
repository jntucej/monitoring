"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { DURATION, EASE, driftTransition } from "@/components/cinematic/motion-presets";

export type BubbleTone = "primary" | "ghost";

export interface LoginBubbleProps {
  label: string;
  sublabel?: string;
  accent?: string;
  size?: number;
  seed?: number;
  href?: string;
  tone?: BubbleTone;
}

export function LoginBubble({
  label,
  sublabel,
  accent = "#67e8f9",
  size = 120,
  seed = 0,
  href = "/login",
  tone = "primary",
}: LoginBubbleProps) {
  const router = useRouter();
  const reduce = useReducedMotion();

  const isGhost = tone === "ghost";

  return (
    <motion.button
      type="button"
      onClick={() => router.push(href)}
      aria-label={`Navigate to ${label}`}
      initial={reduce ? false : { opacity: 0, scale: 0.9 }}
      animate={{
        opacity: 1,
        scale: 1,
        ...(reduce ? {} : { y: [0, -8] }),
      }}
      transition={{
        opacity: { duration: DURATION.card, ease: EASE.gentle, delay: seed * 0.08 },
        scale: { duration: DURATION.card, ease: EASE.gentle, delay: seed * 0.08 },
        ...(reduce ? {} : { y: driftTransition(seed) }),
      }}
      whileHover={reduce ? undefined : { scale: 1.04 }}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      className="group relative flex flex-col items-center justify-center rounded-full text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070B14]"
      style={{
        width: size,
        height: size,
        background: isGhost
          ? "rgba(255,255,255,0.02)"
          : `radial-gradient(circle at 30% 30%, ${accent}22, rgba(255,255,255,0.04) 60%)`,
        border: `1px solid ${isGhost ? "rgba(255,255,255,0.08)" : `${accent}33`}`,
        boxShadow: isGhost
          ? "none"
          : `0 0 60px -20px ${accent}66, inset 0 1px 0 rgba(255,255,255,0.08)`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <span className="text-sm font-medium tracking-wide">{label}</span>
      {sublabel && (
        <span className="mt-1 max-w-[80%] text-center text-[10px] leading-tight text-white/40">
          {sublabel}
        </span>
      )}
    </motion.button>
  );
}
