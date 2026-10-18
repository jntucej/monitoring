"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { DURATION, EASE, driftTransition } from "@/components/cinematic/motion-presets";

export type BubbleTone = "solid" | "ghost";

export interface LoginBubbleProps {
  label: string;
  sublabel?: string;
  accent?: string;
  size?: number;
  seed?: number;
  href?: string;
  onClick?: () => void;
  tone?: BubbleTone;
  primary?: boolean;
  onRipple?: (x: number, y: number) => void;
}

export function LoginBubble({
  label,
  sublabel,
  accent = "#67e8f9",
  size = 120,
  seed = 0,
  href = "/login",
  onClick,
  tone = "solid",
  primary = false,
  onRipple,
}: LoginBubbleProps) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLButtonElement | null>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 220, damping: 22, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 220, damping: 22, mass: 0.6 });

  const handlePointerMove = (e: React.PointerEvent) => {
    if (reduce || !ref.current) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const r = ref.current.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy);
    const influence = r.width * 0.7;
    if (dist < influence) {
      const pull = (1 - dist / influence) * 6; // gentler
      mx.set((dx / (dist || 1)) * pull);
      my.set((dy / (dist || 1)) * pull);
    } else {
      mx.set(0);
      my.set(0);
    }
  };

  const handlePointerLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onRipple?.(e.clientX, e.clientY);
    if (onClick) onClick();
    else router.push(href);
  };

  const surface =
    tone === "solid"
      ? {
          background: `radial-gradient(circle at 30% 30%, ${accent}26, rgba(255,255,255,0.05) 60%)`,
          border: `1px solid ${accent}40`,
          boxShadow: `0 0 70px -20px ${accent}80, inset 0 1px 0 rgba(255,255,255,0.10)`,
        }
      : {
          background: "rgba(255,255,255,0.02)",
          border: `1px solid ${accent}35`,
          boxShadow: `inset 0 0 40px -30px ${accent}44`,
        };

  return (
    <motion.div
      animate={reduce ? undefined : { y: -8 }}
      transition={reduce ? undefined : driftTransition(seed)}
      style={{ width: size, height: size }}
    >
      <motion.button
        ref={ref}
        type="button"
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        aria-label={sublabel ? `${label} — ${sublabel}` : label}
        initial={reduce ? false : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: DURATION.card,
          ease: EASE.gentle,
          delay: seed * 0.08,
        }}
        whileHover={reduce ? undefined : { scale: 1.03 }}
        whileTap={reduce ? undefined : { scale: 0.97 }}
        style={{ x: sx, y: sy, width: "100%", height: "100%", ...surface }}
        className="group relative flex min-h-[44px] min-w-[44px] cursor-pointer flex-col items-center justify-center rounded-full text-white backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-cyan-300/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#070B14]"
      >
        <span
          className={
            primary
              ? "text-lg font-medium tracking-wide"
              : "text-base font-medium tracking-wide"
          }
        >
          {label}
        </span>
        {sublabel && (
          <span className="mt-1 max-w-[85%] text-center text-xs leading-tight text-white/55">
            {sublabel}
          </span>
        )}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-700 group-hover:opacity-100"
          style={{ boxShadow: `inset 0 0 50px ${accent}26` }}
        />
      </motion.button>
    </motion.div>
  );
}
