"use client";

import { useCurrentFrame, interpolate } from "remotion";

export interface GlossyHeroCompositionProps {
  title?: string;
}

export const GlossyHeroComposition: React.FC<GlossyHeroCompositionProps> = () => {
  const frame = useCurrentFrame();

  const wave1 = Math.sin(frame * 0.05) * 15;
  const wave2 = Math.cos(frame * 0.04) * 12;

  // Real-time audio visualizer bar heights
  const bars = Array.from({ length: 16 }, (_, i) => {
    return Math.abs(Math.sin(frame * 0.08 + i * 0.4)) * 30 + 10;
  });

  return (
    <div className="relative w-full h-full min-h-[180px] rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900/80 via-emerald-950/30 to-slate-950/90 border border-white/15 p-6 flex flex-col justify-between">
      {/* Background Floating Glossy Orbs */}
      <div
        className="absolute top-4 left-10 w-36 h-36 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none"
        style={{ transform: `translateY(${wave1}px)` }}
      />
      <div
        className="absolute bottom-4 right-10 w-44 h-44 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none"
        style={{ transform: `translateY(${wave2}px)` }}
      />

      {/* Header Info */}
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold tracking-wider uppercase mb-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Real-Time Gate Telemetry
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white">Campus Access Controller</h2>
      </div>

      {/* Animated Telemetry Equalizer Bars */}
      <div className="relative z-10 flex items-end gap-1.5 h-12 mt-4">
        {bars.map((h, index) => (
          <div
            key={index}
            className="flex-1 rounded-t bg-gradient-to-t from-emerald-500/40 to-cyan-400/80 transition-all duration-75 shadow-sm"
            style={{ height: `${h}px` }}
          />
        ))}
      </div>
    </div>
  );
};

export default GlossyHeroComposition;
