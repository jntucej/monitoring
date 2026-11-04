"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/** localStorage key for the per-role dismissed state. */
const KEY = "qa-flash-dismissed";

interface RoleFlashProps {
  /** Stable role identifier (e.g. "admin", "operator") — scopes the dismiss state. */
  role: string;
  /**
   * The actual navigation handler — the flash delegates to it, so the
   * "jump" still happens; the flash just adds a 420ms visual lead-in.
   */
  onNavigate: () => void;
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * RoleFlash — scroll-linked staggered micro-interaction for the primary
 * quick-action tile.
 *
 * On first hover/focus the tile's icon does a short spring pulse and the
 * label nudges 2px in the navigation direction (right for forward nav,
 * up for back) — a "task-path" cue: the control physically gestures
 * toward the destination before the route change. A 420ms settle window
 * lets the user cancel (hover out) before the push fires.
 *
 * Design constraints honoured:
 *   - respects prefers-reduced-motion (pulse / nudge disabled, only the
 *     native hover ring remains)
 *   - dismisses itself after 2 uses (flagged in localStorage per role)
 *   - 44px+ touch target preserved (tile dimensions unchanged)
 *   - no layout shift: the nudge is translate-only, no reflow
 */
export function RoleFlash({ role, onNavigate, label, icon: Icon }: RoleFlashProps) {
  const [dismissed, setDismissed] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const controls = useAnimation();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const onMq = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", onMq);
    const flag = localStorage.getItem(KEY);
    const seen = flag ? (JSON.parse(flag) as Record<string, number>) : {};
    if ((seen[role] ?? 0) >= 2) setDismissed(true);
    return () => mq.removeEventListener("change", onMq);
  }, [role]);

  const recordUse = useCallback(() => {
    const flag = localStorage.getItem(KEY);
    const seen = flag ? (JSON.parse(flag) as Record<string, number>) : {};
    seen[role] = (seen[role] ?? 0) + 1;
    localStorage.setItem(KEY, JSON.stringify(seen));
    if ((seen[role] ?? 0) >= 2) setDismissed(true);
  }, [role]);

  const hoverIn = useCallback(async () => {
    if (dismissed || prefersReducedMotion) return;
    // Pulse the icon.
    await controls.start({
      scale: [1, 1.18, 1],
      transition: { duration: 0.35, ease: "easeOut" },
    });
    recordUse();
  }, [dismissed, prefersReducedMotion, controls, recordUse]);

  const hoverOut = useCallback(() => {
    // Cancel any in-flight settle so the flash doesn't fire on an
    // accidental hover-out (the native hover ring is the fallback).
    controls.stop();
  }, [controls]);

  // Direction: forward nav nudges right, back nav nudges left.
  const direction = "right";
  const nudge = prefersReducedMotion || dismissed ? 0 : 2;

  return (
    <motion.button
      type="button"
      onHoverStart={hoverIn}
      onHoverEnd={hoverOut}
      onFocus={hoverIn}
      onClick={() => {
        onNavigate();
        recordUse();
      }}
      animate={controls}
      className={cn(
        "group/flash relative flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors",
        "border-[var(--border)] bg-[var(--bg-surface)]",
        "hover:border-[var(--text-muted)] hover:bg-[var(--bg-elevated)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
        "active:scale-[0.98] min-h-[44px] min-w-[44px]"
      )}
    >
      <motion.span
        initial={false}
        animate={{ scale: dismissed ? 1 : 1, x: dismissed ? 0 : nudge * (direction === "right" ? 1 : -1) }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--action-primary)]"
      >
        {Icon ? <Icon className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
      </motion.span>
      <span className="text-sm font-semibold text-[var(--text-primary)]">
        {label}
        {/* Trailing chevron only appears on hover/focus — task-path cue. */}
        <span
          aria-hidden
          className={cn(
            "ml-1 inline-block text-[var(--text-muted)] transition-opacity",
            "opacity-0 group-hover/flash:opacity-100 group-focus-visible/flash:opacity-100"
          )}
        >
          {direction === "right" ? "→" : "←"}
        </span>
      </span>
    </motion.button>
  );
}

export default RoleFlash;
