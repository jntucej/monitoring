'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, KeyRound, QrCode } from 'lucide-react';
import { useGlass } from '@/context/GlassContext';

interface ScanViewfinderProps {
  onStartScanner: () => void;
  onManualEntry: () => void;
  /** Set while a scan request is in flight — reserved for future use. */
  scanning?: boolean;
  /** Roll number from the most recent scan — reserved for future use. */
  lastScanRoll?: string;
}

/*
 * Operator gate scan viewfinder.
 * No duplicated Camera/Manual mode tiles — those options live in the desk's
 * top mode bar. The QR/Barcode mode tabs live inside the Scanner modal itself,
 * so this panel is just a clean entry point:
 *   - Open Camera Scanner (QR + Barcode tabs inside the modal, fixed gate)
 *   - Manual Entry (jumps to the manual roll-number form)
 * Buttons stack full-width on mobile, sit side-by-side on sm+.
 * Camera-unavailable fallback (Upload / manual) is handled inside the Scanner
 * modal, not here.
 */
export function ScanViewfinder({
  onStartScanner,
  onManualEntry,
}: ScanViewfinderProps) {
  const { wsConnected, wsReconnecting } = useGlass();

  return (
    <div className="relative flex-1 min-h-[220px] sm:min-h-[300px] w-full rounded-2xl overflow-hidden flex flex-col justify-between bg-[var(--bg-surface)] border border-[var(--border)] p-4 sm:p-6 shadow-sm">
      {/* Connection status — always visible */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1" />
        {wsReconnecting ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Reconnecting
          </span>
        ) : wsConnected ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Live
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/15 border border-slate-500/30 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
            Offline
          </span>
        )}
      </div>

      {/* Scanner workspace info */}
      <div className="flex flex-col items-center justify-center flex-1 py-4 sm:py-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-inner">
          <QrCode className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-1.5">
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            Gate Scanner
          </h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Scan student ID QR codes, employee badges, or 1D barcodes for
            instant verification. QR and Barcode modes auto-detect inside the
            camera scanner.
          </p>
        </div>
      </div>

      {/* Action buttons — stack vertically on mobile, 2-col grid on sm+ */}
      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 pt-4 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={onStartScanner}
          className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] min-w-0"
        >
          <Camera className="w-4 h-4 shrink-0" />
          <span className="truncate">Open Camera Scanner</span>
        </button>
        <button
          type="button"
          onClick={onManualEntry}
          className="w-full py-3 px-4 rounded-xl bg-[var(--bg-base)] hover:bg-[var(--border)] text-[var(--text-primary)] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-[var(--border)] transition-all active:scale-[0.98] min-w-0"
        >
          <KeyRound className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="truncate">Manual Entry</span>
        </button>
      </div>
    </div>
  );
}
