"use client";

/**
 * Campus Feed — merged official announcements + campus events.
 * Each entry shows its publisher and last-updated time; items created
 * by admins/sysadmins carry a "Verified notice" badge.
 *
 * Filters: all / announcements / events / followed.
 * All data comes from /api/campus/feed (server-authorized).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Megaphone,
  CalendarDays,
  ShieldCheck,
  User,
  Clock,
  Inbox,
  Loader2,
  Star,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

type FeedFilter = "all" | "announcements" | "events" | "followed";

const FILTERS: Array<{ id: FeedFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "announcements", label: "Announcements" },
  { id: "events", label: "Events" },
  { id: "followed", label: "Followed" },
];

interface FeedAnnouncement {
  id: string;
  title: string;
  message: string;
  priority: string;
  publisher: string;
  isOfficial: boolean;
  lastUpdated: string | null;
  followed: boolean;
}

interface FeedEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  publisher: string;
  isOfficial: boolean;
  lastUpdated: string | null;
}

interface FeedData {
  announcements: FeedAnnouncement[];
  events: FeedEvent[];
  followedCount: number;
}

function formatWhen(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function VerifiedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400"
      title="Published by an administrator"
    >
      <ShieldCheck className="h-3 w-3" aria-hidden />
      Verified notice
    </span>
  );
}

export function CampusFeed({ limit = 20 }: { limit?: number }) {
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [data, setData] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (f: FeedFilter) => {
      try {
        setLoading(true);
        const res = await fetch(`/api/campus/feed?filter=${encodeURIComponent(f)}`, {
          headers: getAuthHeaders(),
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          throw new Error(json?.error?.message ?? "Failed to load feed");
        }
        setData(json.data as FeedData);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load feed");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  const items = useMemo(() => {
    if (!data) return [];
    const out: Array<{
      key: string;
      kind: "announcement" | "event";
      title: string;
      body: string;
      meta: string;
      isOfficial: boolean;
      followed: boolean;
    }> = [];
    for (const a of data.announcements) {
      out.push({
        key: `ann-${a.id}`,
        kind: "announcement",
        title: a.title,
        body: a.message,
        meta: `${formatWhen(a.lastUpdated) ?? "updated"} · ${a.publisher}`,
        isOfficial: a.isOfficial,
        followed: a.followed,
      });
    }
    for (const e of data.events) {
      out.push({
        key: `ev-${e.id}`,
        kind: "event",
        title: e.title,
        body: e.description,
        meta: `${formatWhen(e.startsAt) ?? "scheduled"} · ${e.publisher}`,
        isOfficial: e.isOfficial,
        followed: false,
      });
    }
    return out.slice(0, limit);
  }, [data, limit]);

  return (
    <WidgetBoundary title="Campus Feed">
      <section aria-label="Campus feed" className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <Megaphone className="h-4 w-4 text-indigo-400" aria-hidden />
            Campus Feed
          </h2>
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Feed filter">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors motion-reduce:transition-none ${
                  filter === f.id
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filter === "followed" && data ? (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {data.followedCount === 0
              ? "You haven't followed any announcements yet."
              : `${data.followedCount} followed announcement${data.followedCount === 1 ? "" : "s"}.`}
          </p>
        ) : null}

        {loading && !data ? (
          <div className="mt-8 flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-muted)]" role="status">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
            Loading feed…
          </div>
        ) : error && !data ? (
          <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>
        ) : items.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center text-[var(--text-muted)]">
            <Inbox className="h-6 w-6 opacity-50" aria-hidden />
            <p className="text-sm">Nothing here yet.</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3" aria-label="Feed items">
            {items.map((item) => (
              <li
                key={item.key}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-raised)]/40 p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {item.kind === "announcement" ? (
                      <Megaphone className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                    ) : (
                      <CalendarDays className="h-4 w-4 shrink-0 text-sky-400" aria-hidden />
                    )}
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                    {item.isOfficial && <VerifiedBadge />}
                    {item.followed && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                        <Star className="h-3 w-3" aria-hidden />
                        Followed
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs text-[var(--text-muted)]">{item.body}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] text-[var(--text-muted)]">
                  <User className="h-3 w-3" aria-hidden />
                  {item.meta}
                  <span aria-hidden>·</span>
                  <Clock className="h-3 w-3" aria-hidden />
                  <span>{new Date().toLocaleDateString()}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </WidgetBoundary>
  );
}
