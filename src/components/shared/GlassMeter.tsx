"use client";

import { motion } from "framer-motion";
import { useGlass } from "@/context/GlassContext";
import { cn } from "@/lib/utils";

export interface GlassMeterProps {
  label?: string;
  className?: string;
}

export function GlassMeter({ label = "Traffic", className = "" }: GlassMeterProps) {
  const { gateTraffic, isDark } = useGlass();
  const clamped = Math.min(100, Math.max(0, gateTraffic));

  return (
    <div className={cn("w-full max-w-xs", className)}>
      <div className="flex justify-between text-xs text-neutral-400 mb-1 font-mono">
        <span>{label}</span>
        <span>{Math.round(clamped)}%</span>
      </div>
      <div
        className={cn(
          "relative h-3 rounded-full backdrop-blur-md border overflow-hidden",
          isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
        )}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className={cn(
            "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r",
            clamped > 70 ? "from-emerald-500 to-rose-500" : "from-emerald-400 to-emerald-300"
          )}
          style={{
            boxShadow: "0 0 20px rgba(16,185,129,0.3)",
          }}
        />
        {/* Glass surface highlight */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}

export default GlassMeter;
