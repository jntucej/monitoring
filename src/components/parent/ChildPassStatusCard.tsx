/**
 * parent/ChildPassStatusCard — per-ward pass status list for the guardian.
 *
 * Shows each ward's active/recent passes with a live status pill,
 * curfew countdown for hostellers, and a "track" link that opens
 * PassTrackTimeline.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Ticket, MapPin, Clock, CheckCircle2, XCircle, Loader2, ArrowUpRight,
} from "lucide-react";
import { getAuthHeaders, cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

export interface ChildPassRow {
  id: string;
  wardName: string;
  code: string;
  label: string;
  status: string; // PENDING | APPROVED | REJECTED | COMPLETED
  from: string;
  to: string;
  gateInAt?: string | null;
  gateOutAt?: string | null;
  curfewTime?: string | null;
  isHosteller?: boolean;
}

export interface ChildPassStatusCardProps {
  passes: ChildPassRow[];
  /** Open a pass in a detail view / timeline. */
  onTrackPass?: (passId: string) => void;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-action-warning/10 text-action-warning border-action-warning/20",
  APPROVED: "bg-action-success/10 text-action-success border-action-success/20",
  REJECTED: "bg-action-danger/10 text-action-danger border-action-danger/20",
  COMPLETED: "bg-action-info/10 text-action-info border-action-info/20",
};

export function ChildPassStatusCard({ passes, onTrackPass, className }: ChildPassStatusCardProps) {
  const { addToast } = useUIStore();

  const handleTrack = (passId: string) => {
    onTrackPass?.(passId);
    addToast({
      variant: "info",
      title: "Tracking pass",
      message: `Opening timeline for ${passId.slice(0, 8)}…`,
    });
  };

  // Group by ward
  const byWard = new Map<string, ChildPassRow[]>();
  for (const p of passes) {
    const list = byWard.get(p.wardName) ?? [];
    list.push(p);
    byWard.set(p.wardName, list);
  }

  return (
    <WidgetBoundary name="child-pass-status">
      <div className={cn("surface-card p-3 space-y-3", className)}>
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-action-primary" />
          <h2 className="text-sm font-bold text-text-primary">Pass status</h2>
          <span className="ml-auto text-[10px] text-text-muted">{passes.length} total</span>
        </div>

        {passes.length === 0 ? (
          <p className="text-xs text-text-muted py-3 text-center">No recent passes.</p>
        ) : (
          <div className="space-y-3">
            {[...byWard.entries()].map(([ward, list]) => (
              <div key={ward}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-1.5">
                  {ward}
                </p>
                <div className="space-y-1.5">
                  {list.map((p) => {
                    const style = STATUS_STYLES[p.status] ?? "bg-bg-surface text-text-muted";
                    const breached =
                      p.isHosteller && p.curfewTime && p.gateOutAt
                        ? new Date(p.gateOutAt) > new Date(`${p.from.slice(0, 10)}T${p.curfewTime}`)
                        : false;

                    return (
                      <div
                        key={p.id}
                        className="bg-bg-base px-3 py-2 flex items-center gap-2.5"
                      >
                        {/* Status pill */}
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase shrink-0",
                            style
                          )}
                        >
                          {p.status}
                        </span>

                        {/* Pass label + time range */}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-text-primary truncate">
                            {p.label}
                          </p>
                          <p className="text-[10px] text-text-muted tabular-nums">
                            {new Date(p.from).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            →{" "}
                            {new Date(p.to).toLocaleString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>

                        {/* Scan / curfew indicators */}
                        <div className="flex items-center gap-2 shrink-0">
                          {p.gateInAt && <CheckCircle2 className="h-3.5 w-3.5 text-action-success" />}
                          {p.gateOutAt ? (
                            <Clock
                              className={cn(
                                "h-3.5 w-3.5",
                                breached ? "text-action-danger" : "text-action-info"
                              )}
                            />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-text-muted" />
                          )}
                          {breached && (
                            <span className="text-[10px] font-semibold text-action-danger">Late</span>
                          )}

                          {onTrackPass && (
                            <button
                              type="button"
                              onClick={() => handleTrack(p.id)}
                              className="p-1 rounded text-text-muted hover:text-action-primary hover:bg-bg-elevated"
                              title="Track"
                            >
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default ChildPassStatusCard;
