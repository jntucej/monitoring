// src/components/shared/LiveEventsPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// LiveEventsPanel — the "overview of each element" widget. Reads the shared
// useLiveEventStore (fed by LiveEventToaster) and renders the last N live
// campus events as a compact, status-coded list:
//
//   • a severity icon + color per row
//   • a "NEW" chip on events still inside the fresh TTL window
//   • a live counter ("N events since you opened this view")
//   • an empty state that names what the panel is waiting for
//
// Deliberately a *separate* element from the toaster: the toaster is the
// ambient "just happened" cue (transient, top of screen); the panel is the
// scannable history ("what has happened this session"). Together they are
// the "new notification which updates those things" the audit asked for —
// one for the instant, one for the roll-up.
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { motion } from "framer-motion";
import { Radio, AlertCircle, AlertTriangle, Info, Gauge } from "lucide-react";
import { useLiveEventStore, type LiveEvent } from "@/stores/liveEventStore";
import { useAuthStore } from "@/stores/authStore";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { cn } from "@/lib/utils";

const SEV_META: Record<
  NonNullable<LiveEvent["severity"]>,
  { icon: typeof Info; color: string; label: string }
> = {
  critical: { icon: AlertCircle, color: "text-action-danger", label: "critical" },
  high: { icon: AlertTriangle, color: "text-orange-400", label: "high" },
  medium: { icon: Info, color: "text-action-warning", label: "medium" },
  low: { icon: Info, color: "text-action-info", label: "low" },
  info: { icon: Info, color: "text-text-muted", label: "info" },
};

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export function LiveEventsPanel() {
  const { events, totalSeen, lastEventAt } = useLiveEventStore();
  const role = useAuthStore((s) => s.user?.role ?? null);

  return (
    <WidgetBoundary title="Live Events">
      <div className="rounded-2xl border border-border bg-bg-surface/40 p-4 sm:p-5 min-w-0">
        {/* Header: live indicator + session counter */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-action-success opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-action-success" />
            </span>
            <h3 className="text-sm font-semibold text-text-primary truncate">
              Live Events
            </h3>
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted shrink-0">
              live
            </span>
          </div>
          <span
            className={cn(
              "text-[11px] font-mono px-2 py-0.5 rounded-full border shrink-0",
              totalSeen > 0
                ? "border-emerald-500/30 bg-emerald-500/10 text-action-success"
                : "border-border bg-bg-base text-text-muted"
            )}
          >
            {totalSeen} this session
          </span>
        </div>

        {/* Event list */}
        {events.length === 0 ? (
          <div className="p-6 text-center text-xs text-text-muted flex flex-col items-center gap-2">
            <Radio className="w-6 h-6 opacity-30" />
            <p>No live events yet for your role.</p>
            <p className="text-[11px]">
              {role && ACTIVE_ROLE_HINT[role]
                ? ACTIVE_ROLE_HINT[role]
                : "New alerts and gate events will appear here the moment they fire."}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {events.slice(0, 8).map((e) => {
              const meta = SEV_META[e.severity ?? "info"] ?? SEV_META.info;
              const Icon = meta.icon;
              return (
                <motion.div
                  key={e.id}
                  initial={e.fresh ? { opacity: 0, y: -4 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex items-start gap-2.5 p-2.5 rounded-xl border transition-colors",
                    e.fresh
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-transparent hover:bg-[var(--bg-card)]/50"
                  )}
                >
                  <span
                    className={cn(
                      "p-1.5 rounded-lg bg-bg-base border border-border shrink-0",
                      meta.color
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-text-primary truncate">
                        {e.title}
                      </p>
                      {e.fresh && (
                        <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-action-success border border-emerald-500/30 shrink-0">
                          new
                        </span>
                      )}
                    </div>
                    {e.detail && (
                      <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2">
                        {e.detail}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-text-muted">
                      <span className={meta.color}>{meta.label}</span>
                      <span>·</span>
                      <span>{timeAgo(e.at)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {events.length > 8 && (
              <p className="text-[10px] text-text-muted text-center pt-1">
                +{events.length - 8} older events this session
              </p>
            )}
          </div>
        )}

        {/* Footer: last-event heartbeat */}
        {lastEventAt && (
          <p className="text-[10px] font-mono text-text-muted mt-3 pt-3 border-t border-border flex items-center gap-1.5">
            <Gauge className="w-3 h-3" />
            last event {timeAgo(lastEventAt)}
          </p>
        )}
      </div>
    </WidgetBoundary>
  );
}

const ACTIVE_ROLE_HINT: Record<string, string> = {
  admin: "Gate alerts, escalations, and system incidents stream here in real time.",
  sysadmin: "System-health and gateway alerts will appear here the moment they fire.",
  operator: "Scan, gate-offline, and visitor events for your gate will stream here.",
  supervisor: "Escalation and critical-alert events will stream here in real time.",
  vice_principal: "Campus-wide critical alerts will stream here in real time.",
  principal: "Campus-wide critical alerts will stream here in real time.",
};

export default LiveEventsPanel;
