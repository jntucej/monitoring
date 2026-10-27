"use client";

/**
 * Activity Timeline — a self-scoped, reverse-chronological feed of the
 * caller's own campus activity (permission requests, events, notifications,
 * audit actions). Data comes from the server-authorized GET
 * /api/attention/timeline, which only ever returns the caller's own rows.
 *
 * Calm by design: no urgency theatrics — just "what happened, when, and where
 * to act next".
 */
import { useCallback, useEffect, useState } from "react";
import {
  ScrollText,
  FileText,
  CalendarDays,
  Bell,
  History,
  Clock,
  Loader2,
  Inbox,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

type Source = "request" | "event" | "notification" | "audit";

interface TimelineItem {
  id: string;
  source: Source;
  title: string;
  detail: string;
  occurredAt: string | null;
  ctaHref: string | null;
}

interface TimelineData {
  items: TimelineItem[];
  count: number;
  total: number;
}

const SOURCE_META: Record<Source, { icon: typeof FileText; color: string }> = {
  request: { icon: FileText, color: "text-amber-400" },
  event: { icon: CalendarDays, color: "text-sky-400" },
  notification: { icon: Bell, color: "text-indigo-400" },
  audit: { icon: History, color: "text-emerald-400" },
};

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

export function ActivityTimeline({ limit = 12 }: { limit?: number }) {
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/attention/timeline?limit=${limit}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message ?? "Failed to load activity");
      }
      setData(json.data as TimelineData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = data?.items ?? [];

  return (
    <WidgetBoundary title="Activity Timeline">
      <section
        aria-label="Activity timeline"
        className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 min-w-0"
      >
        <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
          <ScrollText className="h-4 w-4 text-emerald-400" aria-hidden />
          Your recent activity
        </h2>

        {loading && !data ? (
          <div
            className="mt-8 flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-muted)]"
            role="status"
          >
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
            Loading activity…
          </div>
        ) : error && !data ? (
          <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center text-[var(--text-muted)]">
            <Inbox className="h-6 w-6 opacity-50" aria-hidden />
            <p className="text-sm">No recent activity yet.</p>
          </div>
        ) : (
          <ol className="relative mt-4 space-y-3" aria-label="Activity items">
            {items.map((item) => {
              const Meta = SOURCE_META[item.source];
              const Icon = Meta.icon;
              const when = formatWhen(item.occurredAt);
              return (
                <li
                  key={item.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-raised)]/40 p-3.5"
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-raised)] ${Meta.color}`}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">{item.detail}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] text-[var(--text-muted)]">
                        <Clock className="h-3 w-3" aria-hidden />
                        {when ?? "—"}
                        {item.ctaHref && (
                          <a
                            href={item.ctaHref}
                            className="ml-2 inline-flex items-center rounded-lg bg-indigo-500/15 px-2 py-0.5 font-medium text-indigo-300 hover:bg-indigo-500/25 motion-safe:transition-colors motion-reduce:transition-none"
                          >
                            Open
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </WidgetBoundary>
  );
}
