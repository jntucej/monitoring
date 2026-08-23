"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, Camera, KeyRound, Monitor } from "lucide-react";
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
    <div className="relative flex-1 min-h-[280px] bg-slate-950 rounded-2xl overflow-hidden border border-[var(--border-strong)] flex flex-col justify-between">
      {/* Background camera simulation & scanner reticle */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
        {isHighEnd ? (
          <Camera className="w-16 h-16 text-slate-800" />
        ) : (
          <Monitor className="w-16 h-16 text-slate-800 animate-pulse" />
        )}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-slate-400">
          <ScanLine className="w-4 h-4 animate-pulse text-emerald-400" />
          <span className="text-xs font-semibold">
            {scanning ? "Processing scan..." : !isHighEnd ? "Low-Profile Mode Active" : "Camera Ready"}
          </span>
        </div>
      </div>

      {/* Target Reticle simplified/removed */}

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
        {isHighEnd ? (
          <button
            type="button"
            onClick={onStartScanner}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <Camera className="w-5 h-5" />
            <span>OPEN CAMERA SCANNER</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onManualEntry}
            className="w-full py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-350 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <KeyRound className="w-5 h-5" />
            <span>USE MANUAL ENTRY DESK</span>
          </button>
        )}
      </div>
    </div>
  );
}
