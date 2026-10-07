"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useMouseParallax } from "@/hooks/useMouseParallax";
import { useGlass } from "@/context/GlassContext";
import { useUIStore } from "@/stores/uiStore";

export function FloatingOrbs() {
  const { x, y, isDesktop } = useMouseParallax(0.025, 20, 120);
  const { performanceTier } = useGlass();
  const theme = useUIStore((s) => s.theme);

  if (performanceTier === "emergency" || performanceTier === "legacy") {
    return null;
  }

  const isGlossy = theme === "glass";

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden floating-orb-container"
      style={{ willChange: "transform", transform: "translateZ(0)" }}
    >
      {/* 3D FLUID RIBBON BACKGROUND — GPU COMPOSITED (NO SVG BLUR GHOSTING ARTIFACTS) */}
      <motion.div
        style={{ x, y }}
        className="absolute inset-0 opacity-80"
        transition={isDesktop ? { type: 'spring', damping: 30, stiffness: 180 } : { duration: 0 }}
      >
        <div className="w-full h-full relative">
          <svg className="w-full h-full min-w-[1000px] min-h-[800px]" viewBox="0 0 1440 900" fill="none">
            <defs>
              <linearGradient id="fluidRibbonGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00c6ff" stopOpacity={isGlossy ? "0.85" : "0.35"} />
                <stop offset="50%" stopColor="#0072ff" stopOpacity={isGlossy ? "0.75" : "0.25"} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={isGlossy ? "0.65" : "0.15"} />
              </linearGradient>
              <linearGradient id="discGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.7" />
              </linearGradient>
            </defs>

            {/* Smooth 3D fluid ribbon path */}
            <motion.path
              d="M -100,250 C 300,100 450,600 800,400 C 1150,200 1300,700 1600,500"
              stroke="url(#fluidRibbonGrad1)"
              strokeWidth={isGlossy ? "52" : "30"}
              strokeLinecap="round"
              animate={{
                d: [
                  "M -100,250 C 300,100 450,600 800,400 C 1150,200 1300,700 1600,500",
                  "M -100,270 C 320,120 430,580 820,420 C 1130,220 1320,670 1600,520",
                  "M -100,250 C 300,100 450,600 800,400 C 1150,200 1300,700 1600,500",
                ]
              }}
              transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
              style={{ filter: "drop-shadow(0px 16px 32px rgba(0, 114, 255, 0.25))" }}
            />

            {isGlossy && (
              <motion.ellipse
                cx="520"
                cy="120"
                rx="65"
                ry="35"
                fill="url(#discGrad)"
                transform="rotate(-25 520 120)"
                animate={{ y: [0, -18, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                style={{ filter: "drop-shadow(0px 12px 24px rgba(99, 102, 241, 0.3))" }}
              />
            )}
          </svg>
        </div>
      </motion.div>
    </div>
  );
}

export default FloatingOrbs;

