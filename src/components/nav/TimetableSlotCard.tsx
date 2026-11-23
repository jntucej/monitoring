"use client";

import Link from "next/link";
import { Clock, MapPin, ArrowUpRight, RefreshCw, XCircle } from "lucide-react";
import { getTimetableAbility, type ResolvedTimetableSlot } from "@/lib/timetable-resolver";

export function TimetableSlotCard({
  slot,
  role,
  onRequestSwap,
  onCancelSlot,
  onInspect,
}: {
  slot: ResolvedTimetableSlot;
  role: string | undefined;
  onRequestSwap?: (slot: ResolvedTimetableSlot) => void;
  onCancelSlot?: (slot: ResolvedTimetableSlot) => void;
  onInspect?: (slot: ResolvedTimetableSlot) => void;
}) {
  const ability = getTimetableAbility(role);
  const href = ability.nextActionHref(slot);
  const isCancelled = slot.status === "cancelled" || slot.status === "holiday";

  return (
    <div
      data-testid={`timetable-slot-${slot.periodNumber}`}
      className={`surface-card p-3.5 space-y-2.5 transition-colors ${
        isCancelled ? "bg-bg-elevated/40 opacity-75" : "bg-bg-surface hover:border-action-primary/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-action-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-action-primary">
              P{slot.periodNumber}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-text-muted">
              <Clock className="h-3 w-3" />
              {slot.startTime} – {slot.endTime}
            </span>
            {slot.roomNumber && (
              <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                <MapPin className="h-3 w-3" />
                {slot.roomNumber}
              </span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-text-primary mt-1">
            {slot.subjectLabel}{" "}
            <span className="font-mono text-xs font-normal text-text-muted">
              ({slot.subjectCode})
            </span>
          </h4>
          <p className="text-xs text-text-secondary">
            {slot.classLabel} · {slot.facultyName}
          </p>
        </div>

        <span
          className={`rounded-full border border-border px-2 py-0.5 text-[11px] font-medium capitalize ${
            slot.attendanceMarked
              ? "bg-emerald-500/10 text-action-success"
              : "bg-bg-elevated text-text-secondary"
          }`}
        >
          {slot.attendanceMarked ? "Marked" : slot.status.replace("_", " ")}
        </span>
      </div>

      {slot.overrideNote && (
        <p className="text-xs text-action-warning">{slot.overrideNote}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
        {href && ability.nextActionLabel && !isCancelled && (
          <Link
            href={href}
            className="inline-flex items-center gap-1 rounded-lg bg-action-primary px-2.5 py-1 text-xs font-medium text-white hover:brightness-110"
          >
            <span>{ability.nextActionLabel}</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        )}

        {ability.canRequestSwapOrCancel && !isCancelled && (
          <>
            {onRequestSwap && (
              <button
                type="button"
                onClick={() => onRequestSwap(slot)}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-bg-elevated"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Swap / Sub</span>
              </button>
            )}
            {onCancelSlot && (
              <button
                type="button"
                onClick={() => onCancelSlot(slot)}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-action-danger hover:bg-rose-500/10"
              >
                <XCircle className="h-3 w-3" />
                <span>Cancel Class</span>
              </button>
            )}
          </>
        )}

        {onInspect && (
          <button
            type="button"
            onClick={() => onInspect(slot)}
            className="ml-auto text-xs font-semibold text-action-primary hover:underline"
          >
            Inspect &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
