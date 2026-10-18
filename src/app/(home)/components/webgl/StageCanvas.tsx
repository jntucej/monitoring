"use client";

import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";
import { usePerformanceTier } from "../hooks/usePerformanceTier";

export default function StageCanvas({ children }: { children: ReactNode }) {
  const tier = usePerformanceTier();
  const dpr = tier === "reduced" ? 1.5 : 2;
  const antialias = tier !== "reduced";

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      <Canvas
        dpr={dpr}
        camera={{ position: [0, 0, 5], fov: 45 }}
        frameloop="always"
        gl={{
          antialias,
          powerPreference: "high-performance",
          alpha: true,
        }}
      >
        {children}
      </Canvas>
    </div>
  );
}
