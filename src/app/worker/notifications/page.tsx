"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import {
  Bell,
  Clock,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Inbox,
} from "lucide-react";

/* response shapes */

interface NotificationRow {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface NotificationsResponse {
  success: boolean;
  data: NotificationRow[];
}

function WidgetError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
      <span className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="truncate">{message}</span>
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
      >
        Retry
      </button>
    </div>
  );
}

function fmtTs(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function WorkerNotificationsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "worker") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<NotificationsResponse>(
    `/api/notifications?type=${encodeURIComponent(role)}&id=${encodeURIComponent(user?.id ?? "")}`,
    { ttlMs: 30_000, enabled: Boolean(user?.id) }
  );

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: Boolean(user?.id) });

  const busy = loading && !data;
  const notifications = data?.data ?? [];
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      <Link
        href="/worker"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Overview
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshAll()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50 shrink-0"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && <WidgetError message={`Notifications unavailable: ${error}`} onRetry={() => void refreshAll()} />}

      <WidgetBoundary title="Notifications">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <Bell className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">My Notifications</span>
            <span className="ml-auto text-xs text-slate-500 shrink-0">
              {unread} unread
            </span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading notifications…
            </div>
          ) : notifications.length > 0 ? (
            <div className="divide-y divide-slate-800/60 min-w-0">
              {notifications.slice(0, 20).map((n) => (
                <div key={n.id} className="px-4 py-3 hover:bg-slate-800/30 transition-colors min-w-0 flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      !n.read ? "bg-amber-500/10 text-amber-400" : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    <Inbox className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm truncate ${!n.read ? "text-white font-semibold" : "text-slate-300"}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 min-w-0">{n.message}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500 whitespace-nowrap">{fmtTs(n.created_at)}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-600 mt-0.5">{n.priority}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Bell className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                No notifications for you yet. Shift alerts, work order updates, and
                announcements addressed to your role will appear here.
              </p>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function WorkerNotificationsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <WorkerNotificationsInner />
    </Suspense>
  );
}
