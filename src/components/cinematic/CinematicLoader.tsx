"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ParticleField } from "./ParticleField";
import { FilmGrain } from "./FilmGrain";

interface CinematicLoaderProps {
  mode?: "checking" | "welcoming";
  onSkip?: () => void;
}

const COPY = {
  checking: { label: "CAMPUS ACCESS", line: "Listening for the first signal…" },
  welcoming: { label: "CAMPUS ACCESS", line: "The campus is waking…" },
};

export function CinematicLoader({
  mode = "checking",
  onSkip,
}: CinematicLoaderProps) {
  const reduce = useReducedMotion();
  const [canSkip, setCanSkip] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setCanSkip(true), 350);
    return () => clearTimeout(t);
  }, []);

  if (reduce || !mounted) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#070B14] text-white">
        <div className="relative z-10 flex flex-col items-center">
          <p className="mb-12 text-[10px] uppercase tracking-[0.4em] text-white/40">
            {COPY[mode].label}
          </p>
          <div className="relative mb-10 h-16 w-16 rounded-full bg-cyan-300/20" />
          <p className="text-sm text-white/55">{COPY[mode].line}</p>
        </div>
      </div>
    );
  }

  const copy = COPY[mode];
  const skippable = canSkip && !!onSkip;

  return (
    <div
      onClick={skippable ? onSkip : undefined}
      role={skippable ? "button" : undefined}
      tabIndex={skippable ? 0 : undefined}
      onKeyDown={(e) => {
        if (skippable && (e.key === "Enter" || e.key === " ")) onSkip?.();
      }}
      aria-label={skippable ? "Skip loading" : undefined}
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#070B14] text-white focus:outline-none ${
        skippable ? "cursor-pointer" : ""
      }`}
    >
      <ParticleField color="#67e8f9" />
      <FilmGrain opacity={0.04} />

      <div className="relative z-10 flex flex-col items-center">
        <p className="mb-12 text-[10px] uppercase tracking-[0.4em] text-white/40">
          {copy.label}
        </p>

        <div className="relative mb-10 h-16 w-16">
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(103,232,249,0.35), transparent 70%)",
            }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300"
            animate={{ scale: [1, 1.15, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              boxShadow:
                "0 0 20px rgba(103,232,249,0.9), 0 0 40px rgba(103,232,249,0.4)",
            }}
          />
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="text-sm text-white/55"
        >
          {copy.line}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: skippable ? 1 : 0 }}
          transition={{ duration: 0.5 }}
          className="mt-10 text-[10px] uppercase tracking-[0.32em] text-white/30"
        >
          Tap anywhere to continue
        </motion.p>
      </div>

      <motion.span
        className="absolute bottom-0 left-0 h-[1px] bg-cyan-300/60"
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ duration: 4, ease: "easeInOut" }}
      />
    </div>
  );
}
