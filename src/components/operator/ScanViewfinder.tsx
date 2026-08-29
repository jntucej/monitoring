'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, KeyRound, QrCode, AlertCircle, Zap } from 'lucide-react';

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
  error,
}: ScanViewfinderProps) {
  return (
    <div className="relative flex-1 min-h-[260px] w-full rounded-2xl overflow-hidden flex flex-col justify-between bg-[var(--bg-surface)] border border-[var(--border)] p-6 shadow-sm">
      {/* Clean Scanner Workspace Info */}
      <div className="flex flex-col items-center justify-center flex-1 py-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-inner">
          <QrCode className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-1.5">
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            QR Code Gate Scanner
          </h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Launch camera scanner to scan dynamic student ID cards or gate passes for instant verification.
          </p>
        </div>
      </div>

      {/* Error overlay */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute inset-0 flex items-center justify-center bg-rose-500/95 backdrop-blur z-30 p-6"
          >
            <div className="text-center text-white space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto" />
              <p className="font-bold">{error.code}</p>
              <p className="text-xs opacity-90">{error.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={onStartScanner}
          className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
        >
          <Camera className="w-4 h-4" />
          <span>Launch Camera Scanner</span>
          <Zap className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onManualEntry}
          className="w-full py-3 px-4 rounded-xl bg-[var(--bg-base)] hover:bg-[var(--border)] text-[var(--text-primary)] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-[var(--border)] transition-all active:scale-[0.98]"
        >
          <KeyRound className="w-4 h-4 text-amber-500" />
          <span>Manual Entry Keypad</span>
        </button>
      </div>
    </div>
  );
}

