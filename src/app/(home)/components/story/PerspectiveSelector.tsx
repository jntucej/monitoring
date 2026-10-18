"use client";

import { useState } from "react";
import { MagneticButton } from "../ui/MagneticButton";
import { usePerspective } from "../hooks/usePerspective";
import type { Perspective } from "./data";

const OPTIONS: Array<{ value: Perspective; label: string }> = [
  { value: "student", label: "Student" },
  { value: "parent", label: "Parent" },
  { value: "guard", label: "Guard" },
  { value: "warden", label: "Warden" },
  { value: "admin", label: "Admin" },
];

export function PerspectiveSelector() {
  const { perspective, setPerspective } = usePerspective();
  const [hovered, setHovered] = useState<Perspective | null>(null);

  return (
    <div
      role="group"
      aria-label="Choose your perspective"
      className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full border border-[var(--home-border-soft)] bg-[rgba(10,10,15,0.7)] px-2 py-2 backdrop-blur-md"
      style={{ boxShadow: "var(--home-shadow-glow)" }}
    >
      <div className="flex items-center gap-1">
        {OPTIONS.map((opt) => {
          const isActive = perspective === opt.value;
          return (
            <MagneticButton
              key={opt.value}
              onClick={() => setPerspective(opt.value)}
              onMouseEnter={() => setHovered(opt.value)}
              onMouseLeave={() => setHovered(null)}
              aria-pressed={isActive}
              className="relative rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                color: isActive
                  ? "var(--home-text-inverse)"
                  : hovered === opt.value
                  ? "var(--home-text-primary)"
                  : "var(--home-text-secondary)",
                background: isActive ? "var(--home-accent-amber)" : "transparent",
              }}
            >
              {opt.label}
            </MagneticButton>
          );
        })}
      </div>
    </div>
  );
}
