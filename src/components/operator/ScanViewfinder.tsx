"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, Camera, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScanViewfinderProps {
  onStartScanner: () => void;
  onManualEntry: () => void;
  scanning?: boolean;
  lastScanRoll?: string;
  error?: { code: string; message: string } | null;
  sampleRolls?: string[];
  onSampleScan?: (roll: string) => void;
}

export function ScanViewfinder({
  onStartScanner,
  onManualEntry,
  scanning,
  lastScanRoll,
  error,
  sampleRolls = ["21CSE101", "21ECE102", "21IT103"],
  onSampleScan,
}: ScanViewfinderProps) {
  return (
    <div className="relative flex-1 min-h-[280px] bg-slate-950 rounded-2xl overflow-hidden border border-[var(--border-strong)] flex flex-col justify-between">
      {/* Background camera simulation & scanner reticle */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
        <Camera className="w-16 h-16 text-slate-800" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-slate-400">
          <ScanLine className="w-4 h-4 animate-pulse text-emerald-400" />
          <span className="text-xs font-medium">
            {scanning ? "Processing scan..." : "Camera Ready"}
          </span>
        </div>
      </div>

      {/* Target Reticle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-48 h-48 border-2 border-emerald-500/50 rounded-2xl flex items-center justify-center">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-emerald-400/80 shadow-[0_0_8px_#34d399]"
            animate={{ top: ["10%", "90%", "10%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
            <p className="text-white font-medium text-xs">Align Student QR</p>
          </div>
        </div>
      </div>

      {/* Error overlay */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute inset-0 flex items-center justify-center bg-rose-500/95 backdrop-blur z-20"
          >
            <div className="text-center text-white p-6">
              <div className="text-3xl mb-2">⚠️</div>
              <p className="font-bold">{error.code}</p>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Action Button Bar inside Viewfinder */}
      <div className="relative z-10 p-4 mt-auto flex flex-col gap-2 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
        <button
          type="button"
          onClick={onStartScanner}
          className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
        >
          <Camera className="w-5 h-5" />
          <span>OPEN CAMERA SCANNER</span>
        </button>

        {onSampleScan && sampleRolls.length > 0 && (
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="text-[11px] text-slate-400 font-mono">Test Scans:</span>
            {sampleRolls.map((roll) => (
              <button
                key={roll}
                type="button"
                onClick={() => onSampleScan(roll)}
                className={cn(
                  "px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors",
                  lastScanRoll === roll && "border-emerald-500 text-emerald-400"
                )}
              >
                {roll}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
