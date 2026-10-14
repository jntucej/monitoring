"use client";

/**
 * Attention Queue — top 5 actionable items for the caller's role.
 * All data comes from /api/attention/queue (server-authorized).
 * Items are composed server-side per role; the client only renders.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Inbox,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

type Urgency = "overdue" | "due" | "info";

interface AttentionItem {
  id: string;
  kind: string;
  title: string;
  urgency: Urgency;
  ctaHref: string;
  detail: string;
}

interface QueueData {
  role: string;
  items: AttentionItem[];
  empty: boolean;
}

const URGENCY_DOT: Record<Urgency, string> = {
  overdue: "bg-rose-400",
  due: "bg-amber-400",
  info: "bg-sky-400",
};

function UrgencyDot({ urgency }: { urgency: Urgency }) {
  return (
    <span
      aria-label={`urgency ${urgency}`}
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${URGENCY_DOT[urgency]}`}
    />
  );
}

export function AttentionQueue() {
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/attention/queue", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message ?? "Failed to load attention queue");
      }
      setData(json.data as QueueData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attention queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const items = data?.items ?? [];

  return (
    <WidgetBoundary title="Attention Queue">
      <section
        aria-label="Attention queue"
        className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 min-w-0"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <AlertTriangle className="h-4 w-4 text-indigo-400" aria-hidden />
            Needs your attention
          </h2>
          {data ? (
            <span className="text-[10px] text-[var(--text-muted)]" aria-hidden>
              {items.length} item{items.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        {loading && !data ? (
          <div
            className="mt-8 flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-muted)]"
            role="status"
          >
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
            Loading attention queue…
          </div>
        ) : error && !data ? (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        ) : data?.empty ? (
          <div className="mt-4 flex flex-col items-center gap-2 py-8 text-center text-[var(--text-muted)]">
            <CheckCircle className="h-6 w-6 text-emerald-400" aria-hidden />
            <p className="text-sm">All clear — nothing needs your attention right now.</p>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 py-8 text-center text-[var(--text-muted)]">
            <Inbox className="h-6 w-6 opacity-50" aria-hidden />
            <p className="text-sm">Nothing here yet.</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3" aria-label="Attention items">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-raised)]/40 p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <UrgencyDot urgency={item.urgency} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{item.detail}</p>
                    </div>
                  </div>
                  <a
                    href={item.ctaHref}
                    aria-label={`Open ${item.title}`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-indigo-500/20 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-300 transition-colors hover:bg-indigo-500/30 hover:text-indigo-200"
                  >
                    Open
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </WidgetBoundary>
  );
}
