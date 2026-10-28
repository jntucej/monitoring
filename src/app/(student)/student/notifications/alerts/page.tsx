"use client";

import { Suspense, useCallback } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { getAuthHeaders } from "@/lib/utils";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { Bell, Loader2, Inbox, ArrowRight, CheckCircle2 } from "lucide-react";
import { NotificationRow, fmtDateTime, NOTIF_CTA } from "../_shared";

function AlertsInner() {
  const user = useAuthStore((s) => s.user);

  const notifUrl = `/api/notifications?type=student&id=${user?.id ?? ""}`;
  const {
    data: notifData,
    loading: notifLoading,
    error: notifError,
    refresh: refreshNotifs,
  } = useApiResource<{ success: boolean; data: NotificationRow[] }>(notifUrl, {
    ttlMs: 30_000,
    enabled: !!user?.id,
  });

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshNotifs()]);
  }, [refreshNotifs]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const notifications: NotificationRow[] = (notifData?.data ?? []).filter(
    (n) => n.recipient_type === "user" || n.recipient_type === "student" || !n.recipient_type
  );

  const markRead = (id: string) => {
    fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    }).catch(() => {});
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-[var(--action-primary)]" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">Personal Notifications</p>
      </div>

      <div className="space-y-2 min-w-0">
        {notifError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400 flex items-center gap-2">
            <Inbox className="w-4 h-4 shrink-0" /> Notification feed unavailable: {notifError}
          </div>
        )}
        {notifLoading && !notifData ? (
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading notifications…
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center space-y-2 min-w-0">
            <Inbox className="w-8 h-8 text-[var(--text-muted)]" />
            <p className="text-xs text-[var(--text-muted)]">No personal notifications right now.</p>
            <p className="text-[10px] text-[var(--text-muted)]">
              New approvals, rejections, and system alerts will appear here.
            </p>
          </div>
        ) : (
          notifications.map((n) => {
            const priorityStyle =
              n.priority === "high" || n.priority === "critical"
                ? "border-rose-500/30 bg-rose-500/5"
                : n.priority === "medium"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-[var(--border)] bg-[var(--bg-surface)]";
            return (
              <div
                key={n.id}
                className={`rounded-xl border p-3 text-xs flex items-start gap-3 min-w-0 ${priorityStyle}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    n.priority === "high" || n.priority === "critical"
                      ? "bg-rose-500/15 text-rose-400"
                      : n.priority === "medium"
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-sky-500/15 text-sky-400"
                  }`}
                >
                  {n.type?.includes("permission") ? <CheckCircle2 className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-bold ${n.read ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"}`}>
                      {n.title}
                    </p>
                    {!n.read && (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className="text-[10px] font-bold text-sky-400 hover:underline shrink-0"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                  <p className="text-[var(--text-muted)] mt-0.5 break-words">{n.message}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">{fmtDateTime(n.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CTA */}
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-elevated)]/40 p-3 text-xs flex items-center justify-between gap-3 min-w-0">
        <span className="text-[var(--text-muted)] min-w-0 truncate">{NOTIF_CTA.text}</span>
        <Link
          href={NOTIF_CTA.href}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 shrink-0"
        >
          {NOTIF_CTA.label} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <DevContactStrip />
    </div>
  );
}

export default function StudentNotificationsAlertsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AlertsInner />
    </Suspense>
  );
}
