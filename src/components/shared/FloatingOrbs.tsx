"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useMouseParallax } from "@/hooks/useMouseParallax";
import { useGlass } from "@/context/GlassContext";

export function FloatingOrbs() {
  const { x, y, isDesktop } = useMouseParallax(0.035, 25, 150);
  const { performanceTier } = useGlass();

  if (performanceTier === "emergency" || performanceTier === "legacy") {
    return null;
  }

  // Floating loop offsets (the "breathing" motion)
  const floatLoop = {
    x: [0, 30, -20, 10, 0],
    y: [0, -20, 30, -10, 0],
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden floating-orb-container">
      {/* ORB 1: PRIMARY (STEEL BLUE) */}
      <motion.div
        style={{ x, y }}
        className="absolute top-[10%] left-[5%] w-[250px] h-[250px] sm:w-[350px] sm:h-[350px] lg:w-[500px] lg:h-[500px]"
        transition={isDesktop ? { type: 'spring', damping: 25, stiffness: 150 } : { duration: 0 }}
      >
        <motion.div
          className="w-full h-full rounded-full bg-gradient-to-br from-blue-400/30 via-blue-500/20 to-transparent blur-2xl sm:blur-3xl"
          animate={floatLoop}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* ORB 2: SECONDARY (INDIGO) */}
      <motion.div
        style={{ x, y }}
        className="absolute bottom-[15%] right-[5%] w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] lg:w-[600px] lg:h-[600px]"
        transition={isDesktop ? { type: 'spring', damping: 25, stiffness: 150 } : { duration: 0 }}
      >
        <motion.div
          className="w-full h-full rounded-full bg-gradient-to-bl from-indigo-400/30 via-indigo-500/20 to-transparent blur-2xl sm:blur-3xl"
          animate={floatLoop}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </div>
  );
}

export default FloatingOrbs;

