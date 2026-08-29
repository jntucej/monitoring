"use client";

import { useGlass } from "@/context/GlassContext";
import { useUIStore } from "@/stores/uiStore";
import { Smartphone, ZapOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function GlassDeviceFallback() {
  const theme = useUIStore((s) => s.theme);
  const { isTouchDevice, performanceTier, displayMode } = useGlass();

  const isGlossy = theme === "glass";
  const supportsBackdrop =
    typeof window !== "undefined" &&
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    (CSS.supports("backdrop-filter", "blur(1px)") ||
      CSS.supports("-webkit-backdrop-filter", "blur(1px)"));

  const isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768 && isTouch;
  const isLowFps = performanceTier === "legacy" || performanceTier === "emergency" || performanceTier === "low";

  if (!isGlossy || (!isMobile && !(isTouchDevice || isTouch) && !isLowFps && supportsBackdrop)) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium flex items-center justify-between gap-2 shadow-sm"
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          <Smartphone className="w-4 h-4 shrink-0 text-amber-500" />
          <span className="truncate">
            Glossy Theme active — Heavy motion graphics automatically optimized for mobile FPS stability.
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
          <ZapOff className="w-3 h-3" /> Mobile Optimized
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default GlassDeviceFallback;
