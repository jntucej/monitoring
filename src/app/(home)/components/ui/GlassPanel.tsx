"use client";

import { forwardRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { SPRING_STORY } from "../hooks/useSpringConfig";
import { usePerformanceTier } from "../hooks/usePerformanceTier";

export type GlassVariant = "cinema" | "strong" | "frosted" | "clear";

export interface GlassPanelProps {
  children: ReactNode;
  variant?: GlassVariant;
  className?: string;
  entry?: boolean;
}

const VARIANT_CLASS: Record<GlassVariant, string> = {
  cinema: "glass-cinema",
  strong: "glass-cinema-strong",
  frosted: "glass-frosted",
  clear: "glass-clear",
};

/**
 * Glass surface with container-query-driven blur.
 * - Outer div: sets the container context (so descendants can query it).
 * - Inner div: the actual glass surface (picks up --home-blur-current).
 *
 * On tier "static" the variant is forced to "clear" (lowest perf).
 */
export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ children, variant = "cinema", className = "", entry = false }, ref) => {
    const tier = usePerformanceTier();
    const effectiveVariant: GlassVariant =
      tier === "static" ? "clear" : variant;

    const surfaceClass = [
      "glass-surface",
      VARIANT_CLASS[effectiveVariant],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    if (!entry) {
      return (
        <div className="home-surface-container">
          <div ref={ref} className={surfaceClass}>
            {children}
          </div>
        </div>
      );
    }

    return (
      <div className="home-surface-container">
        <motion.div
          ref={ref}
          className={surfaceClass}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={SPRING_STORY}
        >
          {children}
        </motion.div>
      </div>
    );
  }
);

GlassPanel.displayName = "GlassPanel";
