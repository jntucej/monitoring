"use client";

import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export interface GlossyGateScanCompositionProps {
  status?: "entry" | "exit" | "idle" | "warning";
  primaryColor?: string;
}

export const GlossyGateScanComposition: React.FC<GlossyGateScanCompositionProps> = ({
  status = "entry",
  primaryColor = "#10b981",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Continuous sweeping light pulse ring
  const pulseScale = interpolate(frame % 90, [0, 45, 90], [1, 1.25, 1], {
    extrapolateRight: "clamp",
  });
  const pulseOpacity = interpolate(frame % 90, [0, 45, 90], [0.6, 0.1, 0.6]);

  // Rotating specular holographic scanner arc
  const rotation = (frame * 2) % 360;

  // Grid line scan wave
  const scanLineY = interpolate(frame % 120, [0, 120], [0, 100]);

  const glowColor =
    status === "entry"
      ? "#10b981"
      : status === "exit"
      ? "#f43f5e"
      : status === "warning"
      ? "#f59e0b"
      : "#3b82f6";

  return (
    <div className="relative w-full h-full min-h-[160px] flex items-center justify-center overflow-hidden rounded-2xl bg-slate-950/40 backdrop-blur-md border border-white/10 p-4">
      {/* Laser Scanning Line Wave */}
      <div
        className="absolute left-0 right-0 h-[2px] pointer-events-none shadow-[0_0_15px_#10b981]"
        style={{
          top: `${scanLineY}%`,
          background: `linear-gradient(90deg, transparent 0%, ${glowColor} 50%, transparent 100%)`,
        }}
      />

      {/* Holographic Specular Arc Ring */}
      <div
        className="absolute w-32 h-32 rounded-full border border-white/20 pointer-events-none"
        style={{
          transform: `rotate(${rotation}deg)`,
          borderTopColor: glowColor,
          boxShadow: `0 0 25px ${glowColor}40`,
        }}
      />

      {/* Pulsing Status Core Halo */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center transition-transform"
        style={{
          transform: `scale(${pulseScale})`,
          opacity: pulseOpacity,
          background: `radial-gradient(circle, ${glowColor}40 0%, transparent 70%)`,
        }}
      />

      {/* Central Holographic Gate Scanner Icon / Telemetry Graphic */}
      <div className="absolute flex flex-col items-center justify-center text-center z-10">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center border border-white/30 bg-white/10 shadow-lg backdrop-blur-md"
          style={{ borderColor: glowColor }}
        >
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: glowColor, boxShadow: `0 0 12px ${glowColor}` }}
          />
        </div>
        <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-white/90 mt-2">
          GATE SECURITY SCANNER
        </span>
      </div>
    </div>
  );
};

export default GlossyGateScanComposition;
