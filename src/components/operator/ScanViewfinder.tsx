"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScanViewfinderProps {
  onScan: (roll: string) => void;
  scanning: boolean;
  lastScanRoll?: string;
  error?: { code: string; message: string } | null;
}

/**
 * ScanViewfinder — the camera area for the Gate Operator screen.
 * On a real tablet this would use the device camera + QR decoder (e.g.
 * @zxing/browser or react-zxing). For the demo / development build we
 * provide a clickable roll-number palette so the full scan → confirm
 * → success flash flow works end-to-end without a camera.
 */
const SAMPLE_ROLLS = ["21CSE101", "21ECE102", "21IT103", "21EEE104", "21ME105", "21CSE106", "21ECE107"];

export function ScanViewfinder({ onScan, scanning, lastScanRoll, error }: ScanViewfinderProps) {
  return (
    <div className="relative flex-1 min-h-[300px] bg-black rounded-xl overflow-hidden border-2 border-[var(--border)]">
      {/* Camera placeholder */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
        <Camera className="w-16 h-16 text-[var(--text-muted)]/50" />
        <div className="absolute bottom-4 left-4 flex items-center gap-2 text-[var(--text-muted)]">
          <ScanLine className="w-4 h-4 animate-pulse" />
          <span className="text-xs">{scanning ? "Scanning..." : "Camera Active"}</span>
        </div>
      </div>

      {/* Scan Ring reticle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-64 h-64">
          {/* Corner brackets */}
          <motion.div
            className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-[var(--action-primary)] rounded-tl-lg"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-[var(--action-primary)] rounded-tr-lg"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />
          <motion.div
            className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-[var(--action-primary)] rounded-bl-lg"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          />
          <motion.div
            className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-[var(--action-primary)] rounded-br-lg"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />

          {/* Scanning line */}
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-[var(--action-primary)]/60"
            animate={{ top: ["10%", "90%", "10%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-white/80 text-sm mb-2">Align QR within frame</p>
            <p className="text-white/50 text-xs">Place student ID card here</p>
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
            className="absolute inset-0 flex items-center justify-center bg-red-500/90"
          >
            <div className="text-center text-white p-6">
              <div className="text-3xl mb-2">⚠️</div>
              <p className="font-bold">{error.code}</p>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sample roll buttons (demo mode — real app uses camera) */}
      <div className="absolute bottom-0 left-0 right-0 bg-[var(--bg-surface)]/80 backdrop-blur border-t border-[var(--border)] p-3 flex flex-wrap justify-center gap-2">
        {SAMPLE_ROLLS.map((roll) => (
          <button
            key={roll}
            type="button"
            onClick={() => !scanning && onScan(roll)}
            disabled={scanning || (lastScanRoll === roll)}
            className={cn(
              "px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)] transition-all",
              !scanning && lastScanRoll !== roll && "hover:border-[var(--action-primary)] hover:text-[var(--action-primary)]",
              lastScanRoll === roll && "border-[var(--action-primary)] text-[var(--action-primary)]"
            )}
          >
            {roll}
          </button>
        ))}
        <span className="text-xs text-[var(--text-muted)] w-full mt-1">Tap a roll to simulate QR scan</span>
      </div>
    </div>
  );
}
