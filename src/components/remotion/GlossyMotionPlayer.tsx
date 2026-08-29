"use client";

import { useState, useEffect } from "react";
import { Player } from "@remotion/player";
import { useUIStore } from "@/stores/uiStore";
import { useGlass } from "@/context/GlassContext";
import { GlossyGateScanComposition } from "./GlossyGateScanComposition";
import { GlossyHeroComposition } from "./GlossyHeroComposition";

export interface GlossyMotionPlayerProps {
  type?: "scan" | "hero";
  status?: "entry" | "exit" | "idle" | "warning";
  className?: string;
}

export function GlossyMotionPlayer({
  type = "scan",
  status = "entry",
  className = "",
}: GlossyMotionPlayerProps) {
  const theme = useUIStore((s) => s.theme);
  const { prefersReducedMotion, performanceTier, isTouchDevice, displayMode } = useGlass();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isGlossy = theme === "glass";
  const isMobileOrLowFps =
    isTouchDevice ||
    performanceTier === "legacy" ||
    performanceTier === "emergency" ||
    performanceTier === "low" ||
    displayMode === "outdoor" ||
    prefersReducedMotion;

  // Static Lightweight SVG / CSS Fallback for Mobile / Non-Glossy / Low-FPS
  if (!mounted || !isGlossy || isMobileOrLowFps) {
    const statusColor =
      status === "entry"
        ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
        : status === "exit"
        ? "text-rose-500 bg-rose-500/10 border-rose-500/30"
        : "text-amber-500 bg-amber-500/10 border-amber-500/30";

    return (
      <div
        className={`relative w-full h-full min-h-[140px] rounded-2xl border bg-slate-900/60 p-4 flex flex-col items-center justify-center text-center ${statusColor} ${className}`}
      >
        <div className="w-10 h-10 rounded-full border border-current flex items-center justify-center animate-pulse mb-2">
          <div className="w-3 h-3 rounded-full bg-current" />
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
          {type === "scan" ? "Gate Scanner Active" : "Campus Gate System"}
        </span>
      </div>
    );
  }

  const componentToRender =
    type === "scan" ? GlossyGateScanComposition : GlossyHeroComposition;

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl ${className}`}>
      <Player
        component={componentToRender as any}
        inputProps={{ status }}
        durationInFrames={180}
        compositionWidth={400}
        compositionHeight={180}
        fps={30}
        style={{
          width: "100%",
          height: "100%",
        }}
        controls={false}
        autoPlay
        loop
      />
    </div>
  );
}

export default GlossyMotionPlayer;
