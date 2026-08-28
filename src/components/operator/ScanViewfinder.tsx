'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, Camera, KeyRound, Sparkles, Cpu, Zap } from 'lucide-react';

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
  return (
    <div className="relative flex-1 min-h-[30vh] max-h-[50vh] aspect-video w-full rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 bg-slate-950 border-2 border-emerald-500/40 shadow-2xl shadow-emerald-500/10">
      {/* Cyber HUD Viewfinder overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-slate-950">
        <motion.div
          animate={{ y: ['0%', '100%', '0%'] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] z-10 opacity-70"
        />

        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
        <div className="absolute bottom-20 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
        <div className="absolute bottom-20 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-400" />

        <div className="absolute inset-0 m-auto w-40 h-40 rounded-2xl border border-emerald-500/30 flex items-center justify-center bg-emerald-500/5 backdrop-blur-[2px]">
          <Camera className="w-10 h-10 text-emerald-400/60 animate-pulse" />
        </div>

        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold uppercase backdrop-blur-md">
            <Sparkles className="w-3 h-3 animate-spin" style={{ animationDuration: '6s' }} />
            LIVE VIEW FINDER
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-400/80 font-mono font-semibold">
            <Cpu className="w-3 h-3 text-emerald-400" />
            OPTICAL SCANNER
          </div>
        </div>

        <div className="absolute bottom-24 left-4 flex items-center gap-2 text-emerald-400/90 z-10">
          <ScanLine className="w-4 h-4 animate-pulse text-emerald-400" />
          <span className="text-xs font-mono font-semibold">
            {scanning ? 'PROCESSING LIVE STREAM...' : 'CAMERA STANDBY • READY'}
          </span>
        </div>
      </div>

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

      {/* Action Button Bar */}
      <div className="relative z-20 p-4 mt-auto grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
        <button
          type="button"
          onClick={onStartScanner}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all transform active:scale-[0.99]"
        >
          <Camera className="w-4 h-4 text-slate-950" />
          <span>LAUNCH CAMERA SCANNER</span>
          <Zap className="w-3.5 h-3.5 text-slate-950" />
        </button>

        <button
          type="button"
          onClick={onManualEntry}
          className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-[0.99]"
        >
          <KeyRound className="w-4 h-4 text-amber-400" />
          <span>MANUAL ENTRY KEYPAD</span>
        </button>
      </div>
    </div>
  );
}
