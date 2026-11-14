"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useMouseParallax } from "@/hooks/useMouseParallax";
import { useGlass } from "@/context/GlassContext";

export function FloatingOrbs() {
  const { x, y, isDesktop } = useMouseParallax(0.025, 20, 120);
  const { performanceTier } = useGlass();
  if (performanceTier === "emergency" || performanceTier === "legacy") {
    return null;
  }


  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden floating-orb-container"
      style={{ willChange: "transform", transform: "translateZ(0)" }}
    >
      {isDesktop ? (
        <motion.div
          style={{ x, y }}
          className="absolute inset-0 opacity-60 sm:opacity-80"
          transition={{ type: 'spring', damping: 30, stiffness: 180 }}
        >
          <div className="w-full h-full relative">
            <svg className="w-full h-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="fluidRibbonGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--action-info)" stopOpacity={"0.35"} />
                  <stop offset="50%" stopColor="var(--action-primary)" stopOpacity={"0.25"} />
                  <stop offset="100%" stopColor="var(--unit-c)" stopOpacity={"0.15"} />
                </linearGradient>
                <linearGradient id="discGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--color-surface)" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="var(--unit-c)" stopOpacity="0.7" />
                </linearGradient>
              </defs>

              <path
                d="M -100,250 C 300,100 450,600 800,400 C 1150,200 1300,700 1600,500"
                stroke="url(#fluidRibbonGrad1)"
                strokeWidth={"30"}
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0px 16px 32px rgba(0, 114, 255, 0.25))" }}
              >
                <animate
                  attributeName="d"
                  dur="18s"
                  repeatCount="indefinite"
                  values="M -100,250 C 300,100 450,600 800,400 C 1150,200 1300,700 1600,500; M -100,270 C 320,120 430,580 820,420 C 1130,220 1320,670 1600,520; M -100,250 C 300,100 450,600 800,400 C 1150,200 1300,700 1600,500"
                />
              </path>

            </svg>
          </div>
        </motion.div>
      ) : (
        <div
          className="absolute inset-0 opacity-30 bg-surface-muted"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default FloatingOrbs;
