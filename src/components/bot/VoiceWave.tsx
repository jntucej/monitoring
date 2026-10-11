"use client";
import { memo } from "react";
import { motion } from "framer-motion";

export const VoiceWave = memo(function VoiceWave({
  active, bars = 5, color = "bg-emerald-500",
}: { active: boolean; bars?: number; color?: string }) {
  return (
    <div className="flex items-center gap-[3px] h-4" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <motion.span
          key={i}
          className={`w-[3px] rounded-full ${color}`}
          animate={active ? { height: [5, 15, 7, 17, 5] } : { height: 4 }}
          transition={active
            ? { duration: 1.05, repeat: Infinity, delay: i * 0.11, ease: "easeInOut" }
            : { duration: 0.2 }}
        />
      ))}
    </div>
  );
});
