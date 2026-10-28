"use client";

import { Suspense, useCallback } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { Megaphone, Loader2, ArrowRight } from "lucide-react";
import { AnnouncementsResponse, fmtDateTime, NOTIF_CTA } from "../_shared";

function AnnouncementsInner() {
  const user = useAuthStore((s) => s.user);

  const {
    data: announcementsRes,
    loading: announcementsLoading,
    refresh: refreshAnnouncements,
  } = useApiResource<AnnouncementsResponse>("/api/announcements/active", {
    ttlMs: 30_000,
  });

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshAnnouncements()]);
  }, [refreshAnnouncements]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const announcements = announcementsRes?.data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <div className="flex items-center gap-2">
        <Megaphone className="w-5 h-5 text-[var(--action-primary)]" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">Campus Announcements</p>
      </div>

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

export default function StudentNotificationsAnnouncementsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AnnouncementsInner />
    </Suspense>
  );
}
