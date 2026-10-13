"use client";

import { useMemo } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import {
  Bell,
  MessageSquare,
  Mail,
  Smartphone,
  Inbox,
  Lock,
  Gauge,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

/* ── response shape (mirrors /api/admin/notification-settings) ────────────── */

interface ChannelStat {
  channel: string;
  notifications: number;
}

interface QueueDepth {
  queue: string;
  depth: number;
}

interface NotificationSettingsData {
  channels: ChannelStat[];
  queue_depth: QueueDepth[];
  preferences_configured_users: number;
  top_types: { type: string; count: number }[];
  note?: string;
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  in_app: <Inbox className="w-3.5 h-3.5" />,
  push: <Smartphone className="w-3.5 h-3.5" />,
  sms: <MessageSquare className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
};

function AdminNotificationSettingsInner() {
  const res = useApiResource<NotificationSettingsData>("/api/admin/notification-settings", { ttlMs: 30_000 });

  usePolling(
    () => {
      clearCache("/api/admin/notification-settings");
      return res.refresh();
    },
    { intervalMs: 60_000 }
  );

  const d = res.data;
  const loading = res.loading && !d;

  const totalQueued = useMemo(
    () => (d?.queue_depth ?? []).reduce((sum, q) => sum + (q.depth || 0), 0),
    [d]
  );

  const configuredPct = useMemo(() => {
    if (!d || d.preferences_configured_users === 0) return null;
    return d.preferences_configured_users;
  }, [d]);

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <WidgetBoundary title="Queue Depth">
          <div className="rounded-xl border border-slate-800 bg-[#0d1220] p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" /> Total Queued
            </div>
            <div className="mt-1.5 text-xl font-black text-white tabular-nums">
              {loading ? <span className="inline-block w-10 h-5 rounded bg-slate-800 animate-pulse" /> : totalQueued}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">Push + SMS + email delivery queues</p>
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="Preferences">
          <div className="rounded-xl border border-slate-800 bg-[#0d1220] p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <Bell className="w-3.5 h-3.5 text-blue-400" /> Preferences Configured
            </div>
            <div className="mt-1.5 text-xl font-black text-white tabular-nums">
              {loading ? <span className="inline-block w-10 h-5 rounded bg-slate-800 animate-pulse" /> : (configuredPct ?? 0)}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">Users with per-channel settings</p>
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="Channels">
          <div className="rounded-xl border border-slate-800 bg-[#0d1220] p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <Inbox className="w-3.5 h-3.5 text-amber-400" /> Active Channels
            </div>
            <div className="mt-1.5 text-xl font-black text-white tabular-nums">
              {loading ? <span className="inline-block w-10 h-5 rounded bg-slate-800 animate-pulse" /> : (d?.channels?.length ?? 0)}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">Delivery channels in use</p>
          </div>
        </WidgetBoundary>
      </div>

      {/* Channel + queue table */}
      <WidgetBoundary title="Channel & Queue Status">
        <div className="rounded-2xl border border-slate-800 bg-[#0d1220] overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-2">
              <div className="h-4 w-40 rounded bg-slate-800 animate-pulse" />
              <div className="h-4 w-52 rounded bg-slate-800 animate-pulse" />
            </div>
          ) : res.error ? (
            <div className="p-6 text-sm text-rose-400">{res.error}</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Channels */}
              <div className="p-4 lg:border-r lg:border-slate-800">
                <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-emerald-400" /> Channel volume
                </h2>
                {(d?.channels?.length ?? 0) === 0 ? (
                  <p className="text-xs text-slate-500">No notification channel activity recorded yet.</p>
                ) : (
                  <div className="divide-y divide-slate-800/60">
                    {d!.channels.map((c) => (
                      <div key={c.channel} className="flex items-center justify-between py-2.5">
                        <span className="flex items-center gap-2 text-xs font-medium text-slate-200 capitalize">
                          {CHANNEL_ICONS[c.channel] || <Inbox className="w-3.5 h-3.5 text-slate-400" />}
                          {c.channel.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs tabular-nums text-slate-400">{c.notifications.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Queues */}
              <div className="p-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <Gauge className="w-4 h-4 text-emerald-400" /> Delivery queue depth
                </h2>
                {(d?.queue_depth?.length ?? 0) === 0 ? (
                  <p className="text-xs text-slate-500">No delivery queues configured.</p>
                ) : (
                  <div className="divide-y divide-slate-800/60">
                    {d!.queue_depth.map((q) => (
                      <div key={q.queue} className="flex items-center justify-between py-2.5">
                        <span className="text-xs font-medium text-slate-200 capitalize">
                          {q.queue.replace(/_/g, " ")} queue
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                            q.depth > 0 ? "bg-amber-500/15 text-amber-300" : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {q.depth}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Top notification types */}
          {(d?.top_types?.length ?? 0) > 0 && (
            <div className="border-t border-slate-800 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Most-sent notification types
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {d!.top_types.map((t) => (
                  <span
                    key={t.type}
                    className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-2 py-1 text-[11px] text-slate-300"
                  >
                    {t.type.replace(/_/g, " ")}
                    <span className="tabular-nums text-emerald-400">{t.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </WidgetBoundary>

      {/* Read-only notice + CTA */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 flex items-start gap-3">
        <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-300">Read-only view</p>
          <p className="mt-1 text-xs text-slate-400">
            Channel enablement, quiet-hours and template configuration are managed by the platform team.
            For per-user channel preferences, users can self-serve via{" "}
            <Link href="/admin/announcements" className="text-emerald-400 hover:underline">
              Announcements
            </Link>{" "}
            and their personal profile.
          </p>
        </div>
      </div>

      <DevContactStrip />
    </div>
  );
}

export default function AdminNotificationSettingsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminNotificationSettingsInner />
    </Suspense>
  );
}
