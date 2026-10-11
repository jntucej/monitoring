"use client";
import { motion } from "framer-motion";

export function VoiceWave({ active, bars = 5 }: { active: boolean; bars?: number }) {
  return (
    <div className="flex items-center gap-[3px] h-5" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-emerald-500"
          animate={active
            ? { height: [6, 16, 8, 18, 6] }
            : { height: 4 }}
          transition={active
            ? { duration: 1.1, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }
            : { duration: 0.2 }}
        />
      ))}
    </div>
  );
}
