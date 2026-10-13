"use client";

import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { getAuthHeaders } from "@/lib/utils";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { Bell, Megaphone, Loader2, Inbox, ArrowRight, CheckCircle2 } from "lucide-react";

/* ── response shapes ── */

interface NotificationRow {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  recipient_type: string;
  read: boolean;
  created_at: string;
}

interface AnnouncementsResponse {
  success: boolean;
  data: Array<{
    id: string;
    title: string;
    message: string;
    priority: string;
    audience: string;
    created_at: string;
    expires_at: string | null;
  }>;
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function StudentNotificationsInner() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<"notifications" | "announcements">("notifications");

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

  const {
    data: announcementsRes,
    loading: announcementsLoading,
    refresh: refreshAnnouncements,
  } = useApiResource<AnnouncementsResponse>("/api/announcements/active", {
    ttlMs: 30_000,
  });

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshNotifs(), refreshAnnouncements()]);
  }, [refreshNotifs, refreshAnnouncements]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const notifications: NotificationRow[] = (notifData?.data ?? []).filter(
    (n) => n.recipient_type === "user" || n.recipient_type === "student" || !n.recipient_type
  );

  const announcements = announcementsRes?.data ?? [];

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
        <p className="text-sm font-semibold text-[var(--text-primary)]">Notifications</p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeTab === "notifications"
              ? "bg-[var(--action-primary)] text-white"
              : "bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-primary)]"
          }`}
        >
          Personal ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("announcements")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeTab === "announcements"
              ? "bg-[var(--action-primary)] text-white"
              : "bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-primary)]"
          }`}
        >
          Announcements ({announcements.length})
        </button>
      </div>

      {activeTab === "notifications" ? (
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
      ) : (
        <div className="space-y-2 min-w-0">
          {announcementsLoading && !announcementsRes ? (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading announcements…
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center space-y-2 min-w-0">
              <Megaphone className="w-8 h-8 text-[var(--text-muted)]" />
              <p className="text-xs text-[var(--text-muted)]">No active campus announcements.</p>
              <p className="text-[10px] text-[var(--text-muted)]">
                Notices for students will be published here by the campus office.
              </p>
            </div>
          ) : (
            announcements.map((a) => (
              <div
                key={a.id}
                className={`rounded-xl border p-3 text-xs min-w-0 ${
                  a.priority === "high" || a.priority === "critical"
                    ? "border-rose-500/30 bg-rose-500/5"
                    : "border-[var(--border)] bg-[var(--bg-surface)]"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <Megaphone
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      a.priority === "high" || a.priority === "critical" ? "text-rose-400" : "text-sky-400"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[var(--text-primary)]">{a.title}</p>
                    <p className="text-[var(--text-muted)] mt-1 break-words">{a.message}</p>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-[var(--text-muted)]">{fmtDateTime(a.created_at)}</span>
                      {a.expires_at && (
                        <span className="text-[10px] text-amber-400">Expires {fmtDateTime(a.expires_at)}</span>
                      )}
                      {a.audience && a.audience !== "all" && (
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                          {a.audience}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CTA */}
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-elevated)]/40 p-3 text-xs flex items-center justify-between gap-3 min-w-0">
        <span className="text-[var(--text-muted)] min-w-0 truncate">
          Manage which notifications you receive and how.
        </span>
        <Link
          href="/settings/notifications"
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 shrink-0"
        >
          Notification Settings <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <DevContactStrip />
    </div>
  );
}

export default function StudentNotificationsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <StudentNotificationsInner />
    </Suspense>
  );
}
