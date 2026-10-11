'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, KeyRound, QrCode, AlertCircle } from 'lucide-react';
import { useGlass } from '@/context/GlassContext';

interface ScanViewfinderProps {
  onStartScanner: () => void;
  onManualEntry: () => void;
  scanning?: boolean;
  lastScanRoll?: string;
  error?: { code: string; message: string } | null;
}

/* Two source icons (Camera / Barcode) + labels, no full-screen QR+barcode modes */
function ModeTile({
  icon,
  label,
  sub,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  active: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border transition-colors ${
        active
          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
          : 'border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)]'
      }`}
    >
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? 'bg-emerald-500/20' : 'bg-[var(--bg-elevated)]'}`}>
        {icon}
      </span>
      <span className="text-xs font-bold text-[var(--text-primary)]">{label}</span>
      <span className="text-[10px] text-[var(--text-muted)]">{sub}</span>
    </div>
  );
}

export function ScanViewfinder({
  onStartScanner,
  onManualEntry,
  error,
}: ScanViewfinderProps) {
  const { wsConnected, wsReconnecting } = useGlass();

  return (
    <div className="relative flex-1 min-h-[260px] w-full rounded-2xl overflow-hidden flex flex-col justify-between bg-[var(--bg-surface)] border border-[var(--border)] p-4 sm:p-6 shadow-sm">
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

      {/* Clean Scanner Workspace Info */}
      <div className="flex flex-col items-center justify-center flex-1 py-4 sm:py-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-inner">
          <QrCode className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-1.5">
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            Gate Scanner
          </h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Scan student ID QR codes, employee badges, or 1D barcodes for instant verification.
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

      {/* Action Buttons — Camera (QR) + Manual, no barcode mode */}
      <div className="space-y-3 pt-4 border-t border-[var(--border)]">
        <div className="grid grid-cols-2 gap-3">
          <ModeTile
            icon={<Camera className="w-4 h-4" />}
            label="Camera"
            sub="QR + barcode"
            active
          />
          <ModeTile
            icon={<KeyRound className="w-4 h-4 text-amber-500" />}
            label="Manual"
            sub="Type roll no."
            active={false}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onStartScanner}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
          >
            <Camera className="w-4 h-4" />
            <span>Open Camera</span>
          </button>
          <button
            type="button"
            onClick={onManualEntry}
            className="w-full py-3 px-4 rounded-xl bg-[var(--bg-base)] hover:bg-[var(--border)] text-[var(--text-primary)] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-[var(--border)] transition-all active:scale-[0.98]"
          >
            <KeyRound className="w-4 h-4 text-amber-500" />
            <span>Manual Entry</span>
          </button>
        </div>
      </div>
    </div>
  );
}

