"use client";

/**
 * My Campus Profile — personalized card for the signed-in user:
 * name / roll / role, pending request count, upcoming event count,
 * tasks completed this month, latest announcement, latest achievement.
 * All data comes from /api/campus/me (server queries real tables).
 */
import { useCallback, useEffect, useState } from "react";
import {
  User,
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  CheckCircle2,
  Megaphone,
  Award,
  Inbox,
  Loader2,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

interface ProfileData {
  user: {
    id: string;
    name: string;
    role: string;
    uniqueId: string | null;
    email: string;
  };
  pendingRequests: number;
  upcomingEvents: number;
  tasksCompletedThisMonth: number;
  latestAnnouncement: {
    id: string;
    title: string;
    message: string;
    priority: string;
    updatedAt: string | null;
  } | null;
  latestAchievement: {
    code: string;
    title: string;
    icon: string | null;
    tier: string;
    earnedAt: string;
  } | null;
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Inbox }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-[var(--text-muted)]" aria-hidden />
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
    </div>
  );
}

export function MyCampusProfile() {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/campus/me", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success || !json.data) {
        throw new Error(json?.error?.message ?? "Failed to load profile");
      }
      setData(json.data as ProfileData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const displayName = data?.user.name ?? user?.name ?? "…";
  const displayRoll = data?.user.uniqueId ?? user?.uniqueId ?? null;
  const displayRole = data?.user.role ?? user?.role ?? null;

  return (
    <WidgetBoundary title="My Campus Profile">
      <section aria-label="My campus profile" className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 min-w-0">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-400">
            <User className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[var(--text-primary)]">{displayName}</p>
            <p className="flex flex-wrap items-center gap-1 text-xs text-[var(--text-muted)]">
              {displayRoll && (
                <span className="rounded bg-[var(--bg-raised)] px-1.5 py-0.5 font-mono text-[10px]">{displayRoll}</span>
              )}
              {displayRole && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide">
                  <BadgeCheck className="h-3 w-3" aria-hidden />
                  {displayRole}
                </span>
              )}
            </p>
          </div>
        </div>

        {loading && !data ? (
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-[var(--text-muted)]" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading your campus profile…
          </div>
        ) : error && !data ? (
          <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-lg border border-rose-400/40 px-2.5 py-1 text-xs font-medium hover:bg-rose-500/20 motion-reduce:transition-none transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : data ? (
          <>
            <div className="mt-5 grid grid-cols-3 gap-2.5">
              <Stat label="Pending requests" value={data.pendingRequests} icon={ClipboardList} />
              <Stat label="Upcoming events" value={data.upcomingEvents} icon={CalendarClock} />
              <Stat label="Done this month" value={data.tasksCompletedThisMonth} icon={CheckCircle2} />
            </div>

            <div className="mt-4 space-y-2.5">
              {data.latestAnnouncement ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-raised)]/40 p-3">
                  <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      Latest announcement: {data.latestAnnouncement.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-muted)]">
                      {data.latestAnnouncement.message}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">No active announcements.</p>
              )}

              {data.latestAchievement ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-raised)]/40 p-3">
                  <Award className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      Latest achievement: {data.latestAchievement.title}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                      {data.latestAchievement.tier} · earned {new Date(data.latestAchievement.earnedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">No achievements earned yet.</p>
              )}
            </div>
          </>
        ) : null}
      </section>
    </WidgetBoundary>
  );
}
