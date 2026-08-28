"use client";

import { useRef } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { Sun, Moon, Sparkles } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

export interface GlassThemeToggleProps {
  isDark?: boolean;
  onToggle?: () => void;
  showCard?: boolean;
  className?: string;
}

/**
 * Premium Apple HIG Glass-morphism Dark / Light / Glass Theme Toggle Component.
 * Uses GPU-accelerated transforms (animate.x) & cursor spring parallax.
 */
export function GlassThemeToggle({
  isDark: propIsDark,
  onToggle: propOnToggle,
  showCard = true,
  className = "",
}: GlassThemeToggleProps) {
  const store = useUIStore();
  const shouldReduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);

  // Controlled or store-connected theme
  const currentTheme = store.theme || "dark";
  const isDarkEffective = propIsDark !== undefined ? propIsDark : currentTheme !== "light";

  // Mouse tracking for reactive glass refraction parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 120, damping: 25 });
  const smoothY = useSpring(mouseY, { stiffness: 120, damping: 25 });

  const glowShiftX = useTransform(smoothX, [-50, 50], [-18, 18]);
  const glowShiftY = useTransform(smoothY, [-50, 50], [-18, 18]);
  const inverseGlowShiftX = useTransform(smoothX, [-50, 50], [18, -18]);
  const inverseGlowShiftY = useTransform(smoothY, [-50, 50], [18, -18]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(((e.clientX - centerX) / rect.width) * 100);
    mouseY.set(((e.clientY - centerY) / rect.height) * 100);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleCycleTheme = () => {
    if (propOnToggle) {
      propOnToggle();
      return;
    }
    // Cycle: dark -> light -> glass -> dark
    if (currentTheme === "dark") store.setTheme("light");
    else if (currentTheme === "light") store.setTheme("glass");
    else store.setTheme("dark");
  };

  const springTransition = shouldReduceMotion
    ? { duration: 0 }
    : ({ type: "spring", stiffness: 500, damping: 30 } as const);

  const modeLabel =
    currentTheme === "glass" ? "Glass mode" : currentTheme === "light" ? "Light mode" : "Dark mode";

  // GPU Transform offset calculation (36px for 80px track, 24px for 56px track)
  const cardThumbOffset = currentTheme === "dark" ? 0 : 36;
  const headerThumbOffset = currentTheme === "dark" ? 0 : 24;

  if (!showCard) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isDarkEffective}
        aria-label="Toggle appearance"
        onClick={handleCycleTheme}
        className={`relative w-14 h-8 rounded-full backdrop-blur-md border transition-colors duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
          isDarkEffective
            ? "bg-white/10 border-white/20"
            : "bg-black/5 border-black/10"
        } ${className}`}
      >
        <motion.div
          animate={{ x: headerThumbOffset }}
          transition={springTransition}
          className={`absolute top-0.5 left-0.5 w-7 h-7 rounded-full shadow flex items-center justify-center backdrop-blur-md border will-change-transform ${
            currentTheme === "glass"
              ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
              : isDarkEffective
              ? "bg-neutral-900/90 border-white/20 text-emerald-300"
              : "bg-white border-black/5 text-amber-500"
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {currentTheme === "glass" ? (
              <motion.span
                key="glass"
                initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5, rotate: 180 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              </motion.span>
            ) : isDarkEffective ? (
              <motion.span
                key="moon"
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
              >
                <Moon className="w-3.5 h-3.5 text-emerald-300" strokeWidth={2} />
              </motion.span>
            ) : (
              <motion.span
                key="sun"
                initial={{ opacity: 0, rotate: 90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: -90 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" strokeWidth={2} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </button>
    );
  }

  return (
    <div
      className={`w-full flex items-center justify-center p-4 sm:p-6 transition-colors duration-700 motion-reduce:transition-none rounded-3xl ${
        isDarkEffective ? "bg-neutral-950/60" : "bg-neutral-100/80"
      } ${className}`}
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      <div className="relative w-full max-w-md">
        {/* Parallax Ambient Glow 1: Emerald Entry Status */}
        <motion.div
          style={{
            x: shouldReduceMotion ? 0 : glowShiftX,
            y: shouldReduceMotion ? 0 : glowShiftY,
          }}
          className={`absolute -top-16 -left-16 w-48 h-48 sm:w-60 sm:h-60 rounded-full blur-3xl transition-colors duration-700 pointer-events-none ${
            currentTheme === "glass"
              ? "bg-emerald-400/50"
              : isDarkEffective
              ? "bg-emerald-500/40"
              : "bg-emerald-300/50"
          }`}
        />
        {/* Parallax Ambient Glow 2: Rose Exit/Alert Status */}
        <motion.div
          style={{
            x: shouldReduceMotion ? 0 : inverseGlowShiftX,
            y: shouldReduceMotion ? 0 : inverseGlowShiftY,
          }}
          className={`absolute -bottom-16 -right-16 w-48 h-48 sm:w-60 sm:h-60 rounded-full blur-3xl transition-colors duration-700 pointer-events-none ${
            currentTheme === "glass"
              ? "bg-purple-500/30"
              : isDarkEffective
              ? "bg-rose-500/30"
              : "bg-rose-300/40"
          }`}
        />

        {/* Glass Card Surface Container with Lift & Refraction */}
        <motion.div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          whileHover={
            shouldReduceMotion
              ? undefined
              : {
                  y: -3,
                  boxShadow: isDarkEffective
                    ? "0 20px 40px -12px rgba(16, 185, 129, 0.25)"
                    : "0 20px 40px -12px rgba(244, 63, 94, 0.2)",
                }
          }
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={`relative overflow-hidden backdrop-blur-2xl border rounded-3xl px-6 sm:px-10 py-7 sm:py-8 flex flex-col items-center gap-6 shadow-2xl transition-colors duration-700 ${
            currentTheme === "glass"
              ? "bg-white/10 border-white/20 shadow-emerald-500/10"
              : isDarkEffective
              ? "bg-white/5 border-white/10"
              : "bg-white/60 border-white/80"
          }`}
        >
          {/* Shimmer Lens Flare Sweep on mount */}
          {!shouldReduceMotion && (
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "200%" }}
              transition={{
                duration: 1.6,
                ease: "easeInOut",
                delay: 0.3,
              }}
              className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none"
            />
          )}
          <div className="text-center">
            <p
              className={`text-xs font-semibold tracking-widest transition-colors duration-700 ${
                isDarkEffective ? "text-white/60" : "text-neutral-500"
              }`}
            >
              GATE STATUS & APPEARANCE
            </p>
            <p
              className={`text-lg font-semibold mt-1 transition-colors duration-700 ${
                isDarkEffective ? "text-white" : "text-neutral-900"
              }`}
            >
              {modeLabel}
            </p>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={isDarkEffective}
            aria-label="Toggle appearance"
            onClick={handleCycleTheme}
            className={`relative w-20 h-11 rounded-full backdrop-blur-md border transition-colors duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              isDarkEffective
                ? "bg-white/10 border-white/20 focus-visible:ring-offset-[var(--bg-base)]"
                : "bg-black/5 border-black/10 focus-visible:ring-offset-[var(--bg-base)]"
            }`}
          >
            {/* Status Pulse Ring on theme transition */}
            <AnimatePresence mode="wait">
              {isDarkEffective ? (
                <motion.div
                  key="pulse-emerald"
                  initial={{ scale: 0.8, opacity: 0.8 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full bg-emerald-500/30 pointer-events-none"
                />
              ) : (
                <motion.div
                  key="pulse-rose"
                  initial={{ scale: 0.8, opacity: 0.8 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full bg-rose-500/30 pointer-events-none"
                />
              )}
            </AnimatePresence>
            <motion.div
              animate={{ x: cardThumbOffset }}
              transition={springTransition}
              className={`absolute top-1 left-1 w-9 h-9 rounded-full shadow-lg flex items-center justify-center backdrop-blur-md border will-change-transform ${
                currentTheme === "glass"
                  ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
                  : isDarkEffective
                  ? "bg-[var(--bg-elevated)] border-white/20"
                  : "bg-white border-black/5"
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {currentTheme === "glass" ? (
                  <motion.span
                    key="sparkles"
                    initial={{ opacity: 0, rotate: -180, scale: 0.5 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 180, scale: 0.5 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                  >
                    <Sparkles className="w-4 h-4 text-emerald-300" strokeWidth={2} />
                  </motion.span>
                ) : isDarkEffective ? (
                  <motion.span
                    key="moon"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                  >
                    <Moon className="w-4 h-4 text-emerald-300" strokeWidth={2} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="sun"
                    initial={{ opacity: 0, rotate: 90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -90 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                  >
                    <Sun className="w-4 h-4 text-amber-500" strokeWidth={2} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </button>
          {/* Tri-mode selection pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/10 dark:bg-white/5 border border-white/10 text-xs select-none">
            <button
              type="button"
              onClick={() => store.setTheme("dark")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                currentTheme === "dark"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => store.setTheme("light")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                currentTheme === "light"
                  ? "bg-white text-neutral-900 shadow border border-neutral-300"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => store.setTheme("glass")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                currentTheme === "glass"
                  ? "bg-emerald-400/20 text-emerald-200 border border-emerald-400/40 shadow-inner"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3 h-3 text-emerald-400" />
              Glass
            </button>
          </div>

          <p
            className={`text-xs text-center max-w-xs transition-colors duration-700 ${
              isDarkEffective ? "text-white/70" : "text-neutral-600"
            }`}
          >
            {isDarkEffective
              ? "Emerald entry status · Rose alert status"
              : "Clear gate status · All systems active"}
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default GlassThemeToggle;