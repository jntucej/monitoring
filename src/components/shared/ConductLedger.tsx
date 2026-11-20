/**
 * shared/ConductLedger — read-only list of a user's conduct events +
 * current flag state. Used in the profile "Conduct" tab and admin
 * user management panel.
 */

"use client";

import { useEffect, useState } from "react";
import {
  ScrollText, Shield, CheckCircle2, XCircle, Clock, AlertTriangle,
} from "lucide-react";
import { getAuthHeaders, cn } from "@/lib/utils";
import { FlagBadge } from "@/components/shared/FlagBadge";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import type { FlagLevel } from "@/lib/permission-model";

export interface ConductLedgerProps {
  /** The user whose ledger to show. */
  userId: string;
  /** Show the current flag + appeal button. */
  showFlag?: boolean;
  /** Called when the user disputes their flag. */
  onDisputeFlag?: () => void;
  className?: string;
}

interface EventRow {
  id: string;
  eventType: string;
  severity: string;
  domain: string;
  description: string;
  recordedAt: string;
  reversed: boolean;
  reversalReason?: string;
}

interface FlagRow {
  currentFlag: FlagLevel;
  reason: string;
  setAt: string;
  expiresAt: string | null;
}

const SEVERITY_STYLES: Record<string, string> = {
  minor: "bg-amber-500/10 text-amber-600",
  major: "bg-orange-500/10 text-orange-600",
  critical: "bg-rose-500/10 text-rose-600",
};

export function ConductLedger({ userId, showFlag = true, onDisputeFlag, className }: ConductLedgerProps) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [flag, setFlag] = useState<FlagRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [evRes, flagRes] = await Promise.all([
          fetch(`/api/conduct/events?userId=${encodeURIComponent(userId)}&limit=50`, {
            headers: getAuthHeaders(),
            cache: "no-store",
          }),
          fetch(`/api/conduct/flags/${encodeURIComponent(userId)}`, {
            headers: getAuthHeaders(),
            cache: "no-store",
          }),
        ]);
        if (cancelled) return;
        const evBody = evRes.ok ? await evRes.json().catch(() => null) : null;
        const flagBody = flagRes.ok ? await flagRes.json().catch(() => null) : null;
        setEvents((evBody?.data ?? []) as EventRow[]);
        setFlag((flagBody?.data as FlagRow | null) ?? null);
      } catch {
        // degrade to empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const activeFlag = flag?.currentFlag && flag.currentFlag !== "clear" ? flag.currentFlag : "clear";

  return (
    <WidgetBoundary name="conduct-ledger">
      <div className={cn("rounded-xl border border-border bg-bg-elevated p-4 space-y-4", className)}>
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-action-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Conduct Ledger</h3>
          <span className="ml-auto text-[10px] text-text-muted">{events.length} events</span>
        </div>

        {/* Current flag */}
        {showFlag && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-bg-base px-3 py-2.5">
            <div className="flex items-center gap-2">
              <FlagBadge flag={activeFlag as FlagLevel} reason={flag?.reason} />
              <span className="text-xs text-text-muted">
                {flag ? `Set ${new Date(flag.setAt).toLocaleDateString("en-IN")}` : "No active flag"}
              </span>
            </div>
            {activeFlag !== "clear" && onDisputeFlag && (
              <button
                type="button"
                onClick={onDisputeFlag}
                className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-600 hover:bg-amber-500/20"
              >
                <AlertTriangle className="h-3 w-3" />
                Dispute this flag
              </button>
            )}
          </div>
        )}

        {/* Events list */}
        {loading ? (
          <p className="text-xs text-text-muted">Loading ledger…</p>
        ) : events.length === 0 ? (
          <div className="text-center py-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-500/40 mx-auto mb-1.5" />
            <p className="text-xs text-text-muted">No conduct events on record.</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {events.map((e) => (
              <div
                key={e.id}
                className={cn(
                  "rounded-lg border border-border bg-bg-base px-3 py-2 text-xs",
                  e.reversed && "opacity-50"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase shrink-0",
                        SEVERITY_STYLES[e.severity] ?? "bg-bg-elevated text-text-muted"
                      )}
                    >
                      {e.severity}
                    </span>
                    <span className="font-medium text-text-primary capitalize truncate">
                      {e.eventType.replace(/_/g, " ")}
                    </span>
                    {e.reversed && (
                      <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                        <XCircle className="h-3 w-3" /> reversed
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-text-muted shrink-0 tabular-nums">
                    {new Date(e.recordedAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {e.description && (
                  <p className="text-[10px] text-text-muted mt-0.5 line-clamp-2">{e.description}</p>
                )}
                {e.reversed && e.reversalReason && (
                  <p className="text-[10px] text-emerald-500 mt-0.5">
                    Reversed: {e.reversalReason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default ConductLedger;
