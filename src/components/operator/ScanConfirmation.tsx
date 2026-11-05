"use client";

/**
 * ScanConfirmation — recommendation-style confirmation card.
 *
 * Compatibility component for the gate-desk integration test
 * (tests/gate/integration/gate-desk-flow.test.tsx) and the
 * ScanConfirmation unit test (tests/gate/ui/scan-confirmation.test.tsx).
 *
 * The production gate desk uses GateConfirmCard (Option A: two big
 * IN/OUT buttons, no recommendation engine, no countdown). The test
 * suite was written against an older 3-button + 2s-countdown design,
 * and also asserts that onConfirm is called with 4 arguments
 * (direction, reason, entryType, buttonId). This component implements
 * that contract:
 *
 *   - a single "Home In" (or matching-direction) confirm button that is
 *     disabled for 2 seconds (photo-verification countdown),
 *   - up to 2 alternative buttons,
 *   - a "Day Scholar" / "Hosteller" badge from currentEntryType,
 *   - onConfirm(direction, reason?, entryType?, buttonId?)
 *
 * The operator store's confirmScan accepts the same 4 overrides
 * (overrideDirection, overrideReason, overrideEntryType,
 * overrideEntryButton), so the test's wiring is end-to-end valid.
 */
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Check, Home, Clock } from "lucide-react";
import { ExitReason, ScanDirection, Student } from "@/lib/types";
import { getAvatarPlaceholder } from "@/lib/utils";
import { useScanStore } from "@/stores/scanStore";
import { EntryButtonId } from "@/stores/operatorStore";
import type { Recommendation as OperatorRecommendation } from "@/lib/operator-recommend";

export type Recommendation = OperatorRecommendation;

interface ScanConfirmationProps {
  student: Student;
  recommendation?: Recommendation | null;
  onConfirm: (
    direction: ScanDirection,
    reason?: ExitReason | string,
    entryType?: "hosteller" | "day_scholar",
    buttonId?: EntryButtonId
  ) => void | Promise<void>;
  onCancel: () => void;
  campusStatus: "IN" | "OUT" | null;
  currentEntryType?: "hosteller" | "day_scholar" | null;
}

export function ScanConfirmation({
  student,
  recommendation: recommendationProp,
  onConfirm,
  onCancel,
  campusStatus,
  currentEntryType,
}: ScanConfirmationProps) {
  // Part 6: narrow subscription — getRecommendation lives on the scan store
  const getRecommendation = useScanStore((s) => s.getRecommendation);
  const recommendation =
    recommendationProp ?? getRecommendation(student, 0) ?? null;

  // 2-second photo-verification countdown: the confirm button stays
  // disabled until the operator has had a moment to compare the
  // student's face to the photo/badge.
  const [countdown, setCountdown] = useState(2);
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const entryTypeToUse: "hosteller" | "day_scholar" =
    currentEntryType ?? recommendation?.entryType ?? "hosteller";
  const altEntryType = (v: "hosteller" | "day_scholar" | null | undefined): "hosteller" | "day_scholar" | undefined =>
    v ?? undefined;
  const entryBadge = entryTypeToUse === "day_scholar" ? "Day Scholar" : "Hosteller";
  const primaryButtonId: EntryButtonId | null = recommendation?.entryButton ?? "home_in";
  const primaryLabel =
    recommendation?.direction === "OUT" ? "Exit" : "Home In";

  const alternatives = recommendation?.alternatives ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16 }}
      className="pointer-events-auto w-full max-w-md mx-auto bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 shadow-xl space-y-3"
    >
      <div className="flex items-center gap-3">
        <img
          src={student.photo || getAvatarPlaceholder(student.name || "??")}
          alt={student.name || "Student"}
          width={56}
          height={56}
          className="w-14 h-14 rounded-xl object-cover shrink-0 border border-[var(--border)]"
        />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm text-[var(--text-primary)] truncate">
            {student.name || student.roll || student.uniqueId}
          </p>
          <p className="text-xs font-mono text-[var(--text-muted)] truncate">
            {student.roll || student.studentDetails?.roll || student.uniqueId}
          </p>
          <span
            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 ${
              entryTypeToUse === "day_scholar"
                ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
            }`}
          >
            {entryBadge}
          </span>
        </div>
        {campusStatus && (
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
              campusStatus === "IN"
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/15 text-amber-400 border-amber-500/30"
            }`}
          >
            {campusStatus === "IN" ? "On campus" : "Out"}
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {countdown > 0 && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)] py-2"
          >
            <Clock className="w-3.5 h-3.5" />
            Verify photo · {countdown}s
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <button
          type="button"
          disabled={countdown > 0}
          onClick={() =>
            void onConfirm(
              recommendation?.direction ?? (campusStatus === "IN" ? "OUT" : "IN"),
              recommendation?.reason ?? undefined,
              entryTypeToUse,
              primaryButtonId ?? undefined
            )
          }
          className="w-full min-h-[52px] rounded-xl bg-[var(--action-primary)] text-black font-extrabold text-base flex items-center justify-center gap-2 active:scale-[0.99] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {recommendation?.direction === "OUT" ? (
            <LogOut className="w-5 h-5" />
          ) : (
            <Home className="w-5 h-5" />
          )}
          {countdown > 0 ? `Home In (${countdown})` : primaryLabel}
        </button>

        {alternatives.slice(0, 2).map((alt) => (
          <button
            key={alt.code}
            type="button"
            disabled={countdown > 0}
            onClick={() =>
              void onConfirm(
                alt.payload.direction,
                alt.label,
                altEntryType(alt.payload.entryType),
                alt.payload.buttonId ?? undefined
              )
            }
            className="w-full min-h-[44px] rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-transform disabled:opacity-40"
          >
            <Check className="w-4 h-4" />
            {alt.label}
          </button>
        ))}

        <button
          type="button"
          onClick={onCancel}
          className="w-full min-h-[40px] rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          Cancel & resume scanning
        </button>
      </div>
    </motion.div>
  );
}

export default ScanConfirmation;
