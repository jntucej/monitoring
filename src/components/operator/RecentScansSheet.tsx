"use client";

// Swipe-up gesture target + bottom sheet listing the operator's recent
// scans. Tapping a row opens ScanDetailModal. Replaces the dead
// ScanDetailModal mount that used to sit on the scanning surface.

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronUp, Clock, ScanLine } from "lucide-react";
import type { Scan } from "@/lib/types";
import { formatTime } from "@/lib/utils";
import { ScanDetailModal } from "./ScanDetailModal";

export type RecentScansSheetProps = {
  scans: Scan[];
  /** Rendered inside the bottom sheet's header. */
  gateName?: string;
};

const SWIPE_THRESHOLD_PX = 48;

export function RecentScansSheet({ scans, gateName }: RecentScansSheetProps) {
  const [open, setOpen] = useState(false);
  const [dragPx, setDragPx] = useState(0);
  const [detailScan, setDetailScan] = useState<Scan | null>(null);
  const startDragY = useRef<number | null>(null);
  const swiping = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only the up-swipe from the target matters; ignore clicks on the list.
    startDragY.current = e.clientY;
    swiping.current = true;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!swiping.current || startDragY.current == null) return;
    const delta = Math.max(0, startDragY.current - e.clientY);
    setDragPx(Math.min(delta, 120));
  }, []);

  const onPointerUp = useCallback(() => {
    if (!swiping.current) return;
    swiping.current = false;
    startDragY.current = null;
    if (dragPx >= SWIPE_THRESHOLD_PX) setOpen(true);
    setDragPx(0);
  }, [dragPx]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sheetOpen = open || detailScan != null;

  return (
    <>
      {/* Up-swipe target, pinned to the bottom of the desk just above the
          IN/OUT decision bar. Hidden when the sheet is open. */}
      {!open && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Swipe up for recent scans"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") setOpen(true);
          }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-0.5 select-none touch-none cursor-grab active:cursor-grabbing"
          style={{ transform: `translate(-50%, ${-Math.round(dragPx / 3)}px)` }}
        >
          <ChevronUp
            className="h-5 w-5 text-[var(--text-muted)]"
            style={{ opacity: 0.4 + dragPx / 160 }}
            aria-hidden
          />
          <span className="text-[10px] font-medium text-[var(--text-muted)]">
            {scans.length} recent
          </span>
        </div>
      )}

      {/* Bottom sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-70" role="dialog" aria-modal="true" aria-label="Recent scans">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (!detailScan) setOpen(false);
              setDetailScan(null);
            }}
            aria-hidden
          />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[70dvh] rounded-t-2xl bg-[var(--bg-surface)] border-t border-[var(--border)] shadow-2xl flex flex-col"
            style={{ maxHeight: "70dvh" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-[var(--text-muted)]" aria-hidden />
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  Recent scans{gateName ? ` · ${gateName}` : ""}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setDetailScan(null);
                }}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {scans.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] py-6 text-center">
                  No recent scans yet.
                </p>
              ) : (
                scans.map((scan) => (
                  <button
                    key={scan.id}
                    type="button"
                    onClick={() => setDetailScan(scan)}
                    className="w-full flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] p-3 text-left hover:border-[var(--border-strong)] transition-colors"
                  >
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        scan.direction === "IN"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      {scan.direction === "IN" ? "IN" : "OUT"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {scan.name || scan.roll || "Unknown"}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {scan.roll}
                        {scan.reason ? ` · ${scan.reason}` : ""}
                        {scan.isCorrection ? " · correction" : ""}
                      </p>
                    </div>
                    <Clock className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" aria-hidden />
                    <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                      {formatTime(scan.timestamp)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail modal for the tapped scan */}
      <ScanDetailModal scan={detailScan} onClose={() => setDetailScan(null)} />
    </>
  );
}
