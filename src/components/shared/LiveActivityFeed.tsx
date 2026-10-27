"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  WifiOff,
  Wifi,
  DoorOpen,
  Bell,
  ShieldAlert,
} from "lucide-react";
import { useGlass } from "@/context/GlassContext";
import { useAuthStore, useHasHydrated } from "@/stores/authStore";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import type { AlertPayload } from "@/lib/mockData";
import { formatTime } from "@/lib/utils";

/**
 * LiveActivityFeed — a compact "Live" feed of relevant events sourced from
 * the GateMonitorWS live channel (via useGlass). Renders gate status
 * changes and alerts filtered to the user's scope (the operator's own gate
 * when they have one, otherwise campus-wide). Falls back to a static
 * empty list when the socket is disconnected.
 */

interface FeedEvent {
  id: string;
  kind: "gate" | "alert";
  title: string;
  detail?: string;
  severity?: AlertPayload["severity"];
  timestamp: number;
}

const MAX_FEED = 12;

const SEVERITY_CLASS: Record<string, string> = {
  info: "bg-[var(--action-info)]/10 text-[var(--action-info)]",
  warning: "bg-[var(--action-warning)]/10 text-[var(--action-warning)]",
  critical: "bg-[var(--action-danger)]/10 text-[var(--action-danger)]",
};

export interface LiveActivityFeedProps {
  /** Optional embedded view (no wrapper card). Default: wrapped in a card. */
  compact?: boolean;
  /** Max events to keep in the feed. Default 12. */
  limit?: number;
}

export function LiveActivityFeed({ compact = false, limit = MAX_FEED }: LiveActivityFeedProps) {
  const hasHydrated = useHasHydrated();
  const user = useAuthStore((s) => s.user);
  const {
    wsConnected,
    wsReconnecting,
    wsTransportExhausted,
    cards,
    activeAlerts,
  } = useGlass();

  const [events, setEvents] = useState<FeedEvent[]>([]);
  const prevCardsRef = useRef<Map<string, string>>(new Map());

  // Ingest gate status changes into the feed (scoped to the user's gate).
  useEffect(() => {
    if (!hasHydrated) return;
    const prev = prevCardsRef.current;
    const additions: FeedEvent[] = [];
    for (const card of cards) {
      const prevStatus = prev.get(card.gateId);
      const isInScope =
        !user?.gateId || card.gateId === user.gateId;
      if (isInScope) {
        if (prevStatus && prevStatus !== card.status && card.status !== "idle") {
          additions.push({
            id: `gate-${card.gateId}-${card.lastUpdate}`,
            kind: "gate",
            title: `${card.name}`,
            detail: `Status: ${card.status.toUpperCase()}`,
            timestamp: card.lastUpdate,
          });
        }
      }
      prev.set(card.gateId, card.status);
    }
    if (additions.length > 0) {
      setEvents((old) => [...additions, ...old].slice(0, limit));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, hasHydrated, limit]);

  // Ingest live alerts into the feed.
  useEffect(() => {
    if (!hasHydrated) return;
    const additions = activeAlerts.map((a: AlertPayload) => ({
      id: `alert-${a.timestamp}-${a.gateId}`,
      kind: "alert" as const,
      title: a.message,
      detail: `${a.gateId} · ${a.severity}`,
      severity: a.severity,
      timestamp: a.timestamp,
    }));
    if (additions.length > 0) {
      setEvents((old) => {
        const seen = new Set(old.map((e) => e.id));
        const fresh = additions.filter((e) => !seen.has(e.id));
        return [...fresh, ...old].slice(0, limit);
      });
    }
     
  }, [activeAlerts, hasHydrated, limit]);

  const offline = !wsConnected && (wsTransportExhausted || !wsReconnecting);

  const feed = (
    <div className="min-w-0">
      {/* Status header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="h-4 w-4 text-[var(--action-primary)] shrink-0" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
            Live Activity
          </h3>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium shrink-0 ${
            offline
              ? "bg-[var(--action-danger)]/10 text-[var(--action-danger)]"
              : "bg-[var(--action-primary)]/10 text-[var(--action-primary)]"
          }`}
        >
          {offline ? (
            <WifiOff className="h-3 w-3" />
          ) : (
            <Wifi className="h-3 w-3" />
          )}
          {offline ? "Offline" : wsReconnecting ? "Reconnecting…" : "Live"}
        </span>
      </div>

      {offline ? (
        /* Static empty list when the socket is disconnected */
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-center">
          <DoorOpen className="mx-auto h-8 w-8 text-[var(--text-muted)]" />
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Live feed disconnected — showing last known events.
          </p>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-center">
          <Bell className="mx-auto h-8 w-8 text-[var(--text-muted)]" />
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            No live events yet. Gate status changes and alerts will appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {events.map((e) => (
            <li
              key={e.id}
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                e.kind === "alert" && e.severity === "critical"
                  ? "border-[var(--action-danger)]/30 bg-[var(--action-danger)]/5"
                  : "border-[var(--border)] bg-[var(--bg-surface)]"
              }`}
            >
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                  e.kind === "gate"
                    ? "bg-[var(--action-info)]/10 text-[var(--action-info)]"
                    : e.severity
                    ? SEVERITY_CLASS[e.severity] ?? SEVERITY_CLASS.info
                    : "bg-[var(--action-warning)]/10 text-[var(--action-warning)]"
                }`}
              >
                {e.kind === "gate" ? (
                  <DoorOpen className="h-3.5 w-3.5" />
                ) : e.severity === "critical" ? (
                  <ShieldAlert className="h-3.5 w-3.5" />
                ) : (
                  <Bell className="h-3.5 w-3.5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                  {e.title}
                </p>
                {e.detail ? (
                  <p className="text-[11px] text-[var(--text-muted)] truncate">{e.detail}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-[10px] text-[var(--text-muted)]">
                {formatTime(new Date(e.timestamp).toISOString())}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (compact) {
    return <WidgetBoundary title="Live Activity">{feed}</WidgetBoundary>;
  }

  return (
    <WidgetBoundary title="Live Activity">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]/40 p-4 sm:p-5">
        {feed}
      </div>
    </WidgetBoundary>
  );
}

export default LiveActivityFeed;
