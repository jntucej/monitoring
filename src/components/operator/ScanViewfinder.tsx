"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, Camera, KeyRound, Monitor, Sparkles, Cpu, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";

interface ScanViewfinderProps {
  onStartScanner: () => void;
  onManualEntry: () => void;
  scanning?: boolean;
  lastScanRoll?: string;
  error?: { code: string; message: string } | null;
}

export function ScanViewfinder({
  onStartScanner,
  onManualEntry,
  scanning,
  lastScanRoll,
  error,
}: ScanViewfinderProps) {
  const { deviceProfile } = useUIStore();
  const isHighEnd = deviceProfile === "high-end";

  return (
    <div className={`relative flex-1 min-h-[300px] rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 ${
      isHighEnd
        ? "bg-slate-950 border-2 border-emerald-500/40 shadow-2xl shadow-emerald-500/10"
        : "bg-slate-900 border border-slate-800"
    }`}>
      {/* High-End Cyber HUD vs Low-Profile Desk */}
      {isHighEnd ? (
        <div className="absolute inset-0 pointer-events-none overflow-hidden bg-slate-950">
          <motion.div
            animate={{ y: ["0%", "100%", "0%"] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] z-10 opacity-70"
          />

          <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
          <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
          <div className="absolute bottom-16 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
          <div className="absolute bottom-16 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-400" />

          <div className="absolute inset-0 m-auto w-40 h-40 rounded-2xl border border-emerald-500/30 flex items-center justify-center bg-emerald-500/5 backdrop-blur-[2px]">
            <Camera className="w-10 h-10 text-emerald-400/60 animate-pulse" />
          </div>

          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold uppercase backdrop-blur-md">
              <Sparkles className="w-3 h-3 animate-spin" style={{ animationDuration: '6s' }} />
              HIGH-SPEC HUD • 60 FPS
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400/80 font-mono font-semibold">
              <Cpu className="w-3 h-3 text-emerald-400" />
              GPU OPTIMIZED
            </div>
          </div>

          <div className="absolute bottom-20 left-4 flex items-center gap-2 text-emerald-400/90 z-10">
            <ScanLine className="w-4 h-4 animate-pulse text-emerald-400" />
            <span className="text-xs font-mono font-semibold">
              {scanning ? "PROCESING LIVE STREAM..." : "CAMERA STANDBY • READY"}
            </span>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="text-center space-y-2 p-4">
            <Monitor className="w-12 h-12 text-amber-400/60 mx-auto" />
            <div className="px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-bold inline-block">
              LOW-PROFILE DESK MODE ACTIVE
            </div>
            <p className="text-[11px] text-slate-400 max-w-xs">
              Optimized for older phones & slow hardware.
            </p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute inset-0 flex items-center justify-center bg-rose-500/95 backdrop-blur z-30"
          >
            <div className="text-center text-white p-6">
              <div className="text-3xl mb-2">⚠️</div>
              <p className="font-bold">{error.code}</p>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Action Button Bar */}
      <div className="relative z-20 p-4 mt-auto flex flex-col gap-2 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
        {isHighEnd ? (
          <button
            type="button"
            onClick={onStartScanner}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all transform active:scale-[0.99]"
          >
            <Camera className="w-5 h-5 text-slate-950" />
            <span>LAUNCH HIGH-SPEC CAMERA SCANNER</span>
            <Zap className="w-4 h-4 text-slate-950" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onManualEntry}
            className="w-full py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-350 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <KeyRound className="w-5 h-5" />
            <span>OPEN MANUAL ENTRY KEYPAD</span>
          </button>
        )}
      </div>
    </div>
  );
}
